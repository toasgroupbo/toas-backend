import {
  BadRequestException,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { StaticRoles } from 'src/auth/enums';

import { CreateOwnerDto, UpdateOwnerDto } from './dto';

import { Owner } from './entities/owner.entity';
import { Rol } from '../roles/entities/rol.entity';
import { User } from '../users/entities/user.entity';
import { CompanyOwner } from '../companies/entities/company-owners.entity';

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(dto: CreateOwnerDto, companyId: number) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { bankAccount, ci, email, password, ...data } = dto;

      const role = await queryRunner.manager.findOne(Rol, {
        where: { name: StaticRoles.CASHIER_OWNER },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      //! Buscar owner existente en ESTA empresa (scoped por companyId)
      let owner = await queryRunner.manager.findOne(Owner, {
        where: {
          ci,
          companyOwner: { company: { id: companyId } },
        },
        relations: {
          companyOwner: { company: true },
          users: { company: true },
        },
      });

      if (owner) {
        //! Owner ya existe en esta empresa → reactivar si estaba deshabilitado
        if (!owner.enabled) {
          owner.enabled = true;
          Object.assign(owner, data);
          if (bankAccount) {
            Object.assign(owner.bankAccount, bankAccount);
          }
          await queryRunner.manager.save(owner);

          const ownerCompany = owner.companyOwner.find(
            (oc) => oc.company.id === companyId,
          );
          if (ownerCompany && !ownerCompany.enabled) {
            ownerCompany.enabled = true;
            await queryRunner.manager.save(ownerCompany);
          }
        } else {
          throw new ConflictException(
            'Owner with this CI already exists in this company',
          );
        }
      } else {
        //! Crear nuevo owner para esta empresa
        owner = queryRunner.manager.create(Owner, {
          ...data,
          ci,
          bankAccount,
        });
        owner = await queryRunner.manager.save(owner);

        const ownerCompany = queryRunner.manager.create(CompanyOwner, {
          owner,
          company: { id: companyId },
        });
        await queryRunner.manager.save(ownerCompany);
      }

      //! Verificar user activo en esta empresa
      const existingUser = owner.users?.find(
        (u) => u.company?.id === companyId,
      );

      if (existingUser) {
        await queryRunner.commitTransaction();
        return owner;
      }

      //! Validar email globalmente
      const emailExists = await queryRunner.manager.findOne(User, {
        where: { email },
        withDeleted: true,
      });

      if (emailExists && !emailExists.deletedAt) {
        throw new ConflictException('Email already in use');
      }

      if (emailExists?.deletedAt) {
        //! Reactivar user eliminado con mismo email
        emailExists.deletedAt = null;
        emailExists.password = password;
        emailExists.fullName = data.name;
        emailExists.phone = data.phone;
        emailExists.ci = ci;
        emailExists.owner = owner;
        await queryRunner.manager.save(emailExists);
      } else {
        //! Crear user
        const user = queryRunner.manager.create(User, {
          email,
          password,
          fullName: data.name,
          ci,
          phone: data.phone,
          rol: role,
          owner,
          company: { id: companyId },
        });
        await queryRunner.manager.save(user);
      }

      await queryRunner.commitTransaction();
      return owner;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number, enabled: boolean = true) {
    const owners = await this.ownerRepository.find({
      where: {
        enabled,
        //! El filtro en companyOwner usa INNER JOIN: si un owner deshabilitado
        //! no tiene un companyOwner con enabled=false para esta company
        //! (inconsistencia de datos), no aparecerá en el resultado.
        companyOwner: {
          company: { id: companyId },
          enabled,
        },
      },
      relations: {
        bankAccount: true,
        users: true,
        buses: true,
        companyOwner: { company: true },
      },
    });

    return owners;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const owner = await this.ownerRepository.findOne({
      where: {
        id,
        enabled: true,
        companyOwner: {
          company: {
            id: companyId,
          },
          enabled: true,
        },
      },
      relations: {
        users: true,
        companyOwner: {
          company: true,
        },
        buses: {
          company: true,
          busType: true,
          travels: true,
        },
        bankAccount: true,
      },
    });

    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    return owner;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateOwnerDto, companyId: number) {
    const owner = await this.findOne(id, companyId);

    try {
      const { bankAccount, ...rest } = dto;

      Object.assign(owner, rest);

      if (bankAccount && owner.bankAccount) {
        Object.assign(owner.bankAccount, bankAccount);
      }

      return await this.ownerRepository.save(owner);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number, companyId: number) {
    const owner = await this.findOne(id, companyId);

    const hasEnabledBuses = owner.buses.some(
      (bus) => bus.enabled && bus.company?.id === companyId,
    );

    if (hasEnabledBuses) {
      throw new BadRequestException(
        'No se puede deshabilitar el propietario porque tiene buses habilitados en esta empresa',
      );
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        //! Deshabilitar relación OwnerCompany
        await manager.update(
          CompanyOwner,
          {
            owner: { id },
            company: { id: companyId },
            enabled: true,
          },
          {
            enabled: false,
          },
        );

        //! Deshabilitar users del owner
        if (owner.users?.length) {
          const ownerUserIds = owner.users.map((u) => u.id);
          await manager.update(User, { id: In(ownerUserIds) }, { enabled: false });
        }

        //! Deshabilitar owner
        await manager.update(Owner, { id: owner.id }, { enabled: false });
      });

      return {
        message: 'Owner Disabled',
        disabled: owner,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
