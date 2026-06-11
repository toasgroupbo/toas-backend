import {
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
import { Bus } from '../buses/entities/bus.entity';
import { Rol } from '../roles/entities/rol.entity';
import { User } from '../users/entities/user.entity';
import { Travel } from '../travels/entities/travel.entity';
import { BusType } from '../buses/entities/bus-type.entity';
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

      //! Buscar owner existente
      let owner = await queryRunner.manager.findOne(Owner, {
        where: { ci },
        relations: {
          companyOwner: {
            company: true,
          },
          users: {
            company: true,
          },
        },
      });

      const role = await queryRunner.manager.findOne(Rol, {
        where: { name: StaticRoles.CASHIER_OWNER },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      //! Crear owner si no existe
      if (!owner) {
        owner = queryRunner.manager.create(Owner, {
          ...data,
          ci,
          bankAccount,
        });

        owner = await queryRunner.manager.save(owner);

        //! Crear relación owner-company
        const ownerCompany = queryRunner.manager.create(CompanyOwner, {
          owner,
          company: { id: companyId },
        });

        await queryRunner.manager.save(ownerCompany);
      } else {
        //! Verificar relación con company
        const ownerCompany = owner.companyOwner.find(
          (oc) => oc.company.id === companyId,
        );

        //! Si no existe -> crear relación
        if (!ownerCompany) {
          const newRelation = queryRunner.manager.create(CompanyOwner, {
            owner,
            company: { id: companyId },
          });

          await queryRunner.manager.save(newRelation);
        }

        //! Si existe pero está deshabilitada -> reactivar
        else if (!ownerCompany.enabled) {
          ownerCompany.enabled = true;
          await queryRunner.manager.save(ownerCompany);
        }

        //! Reactivar owner si estaba deshabilitado
        if (!owner.enabled) {
          owner.enabled = true;
        }

        Object.assign(owner, data);

        await queryRunner.manager.save(owner);
      }

      //! Verificar user existente en esta empresa
      const existingUserForCompany = owner.users?.find(
        (user) => user.company?.id === companyId && !user.deletedAt,
      );

      //! Reactivar user eliminado
      if (existingUserForCompany?.deletedAt) {
        existingUserForCompany.deletedAt = null;
        await queryRunner.manager.save(existingUserForCompany);

        await queryRunner.commitTransaction();
        return owner;
      }

      //! Si ya existe activo
      if (existingUserForCompany) {
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

      //! Reactivar user eliminado con mismo email
      if (emailExists?.deletedAt) {
        emailExists.deletedAt = null;
        emailExists.password = password;
        emailExists.fullName = data.name;
        emailExists.phone = data.phone;
        emailExists.ci = ci;
        emailExists.owner = owner;

        await queryRunner.manager.save(emailExists);

        await queryRunner.commitTransaction();
        return owner;
      }

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

      await queryRunner.commitTransaction();

      return owner;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  /*   async create(dto: CreateOwnerDto, companyId: number) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { bankAccount, ci, email, password, ...data } = dto;

      //! Buscar owner existente
      let owner = await queryRunner.manager.findOne(Owner, {
        where: { ci },
        relations: {
          companies: true,
          users: {
            company: true,
          },
        },
      });

      const role = await queryRunner.manager.findOne(Rol, {
        where: { name: StaticRoles.CASHIER_OWNER },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      //! Crear owner si no existe

      if (!owner) {
        owner = queryRunner.manager.create(Owner, {
          ...data,
          ci,
          bankAccount,
          companies: [{ id: companyId }],
        });

        await queryRunner.manager.save(owner);
      } else {
        //! Si existe → agregar company si falta
        const companyAlreadyAdded = owner.companies.some(
          (c) => c.id === companyId,
        );

        if (!companyAlreadyAdded) {
          owner.companies.push({ id: companyId } as any);
        }

        Object.assign(owner, data);

        await queryRunner.manager.save(owner);
      }

      //! Verificar si ya tiene user en esta empresa
      const existingUserForCompany = owner.users?.find(
        (user) => user.company!.id === companyId,
      );

      if (existingUserForCompany) {
        await queryRunner.commitTransaction();
        return owner;
      }

      //! Validar email SOLO en esta empresa
      const emailExists = await queryRunner.manager.findOne(User, {
        where: {
          email,
          company: { id: companyId },
        },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use for this company');
      }

      //! Crear user para esta empresa

      const user = queryRunner.manager.create(User, {
        email,
        password: password,
        fullName: data.name,
        ci,
        phone: data.phone,
        rol: role,
        owner,
        company: { id: companyId },
      });

      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();
      return owner;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  } */

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number) {
    return await this.ownerRepository.find({
      where: {
        enabled: true,
        companyOwner: {
          company: {
            id: companyId,
          },
          enabled: true,
        },
        users: {
          company: {
            id: companyId,
          },
        },
      },
      relations: {
        bankAccount: true,
        users: true,
        buses: true,
        companyOwner: {
          company: true,
        },
      },
    });
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

      if (bankAccount) {
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

    try {
      await this.dataSource.transaction(async (manager) => {
        //! Obtener buses de esa company
        const buses = owner.buses.filter(
          (bus) => bus.company?.id === companyId && bus.enabled,
        );

        const busIds = buses.map((b) => b.id);

        //! Deshabilitar travels
        if (busIds.length) {
          await manager.update(
            Travel,
            {
              bus: {
                id: In(busIds),
              },
              enabled: true,
            },
            {
              enabled: false,
            },
          );
        }

        //! Deshabilitar busTypes
        const busTypeIds = buses
          .filter((b) => b.busType)
          .map((b) => b.busType.id);

        if (busTypeIds.length) {
          await manager.update(
            BusType,
            {
              id: In(busTypeIds),
            },
            {
              enabled: false,
            },
          );
        }

        //! Deshabilitar buses
        if (busIds.length) {
          await manager.update(
            Bus,
            {
              id: In(busIds),
            },
            {
              enabled: false,
            },
          );
        }

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

        //! Verificar relaciones activas restantes
        const remainingRelations = owner.companyOwner.filter(
          (oc) => oc.company.id !== companyId && oc.enabled,
        );

        //! Si ya no tiene companies activas
        if (!remainingRelations.length) {
          //! Soft delete users
          if (owner.users?.length) {
            await manager.softRemove(owner.users);
          }

          //! Deshabilitar owner
          await manager.update(Owner, { id: owner.id }, { enabled: false });
        }
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
