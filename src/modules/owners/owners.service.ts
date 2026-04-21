import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { StaticRoles } from 'src/auth/enums';

import { CreateOwnerDto, UpdateOwnerDto } from './dto';

import { Owner } from './entities/owner.entity';
import { Bus } from '../buses/entities/bus.entity';
import { Rol } from '../roles/entities/rol.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,

    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,

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

      // --------------------------------------------
      // 1. Buscar owner existente
      // --------------------------------------------

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

      // --------------------------------------------
      // 2. Crear owner si no existe
      // --------------------------------------------

      if (!owner) {
        owner = queryRunner.manager.create(Owner, {
          ...data,
          ci,
          bankAccount,
          companies: [{ id: companyId }],
        });

        await queryRunner.manager.save(owner);
      } else {
        // --------------------------------------------
        // 3. Si existe → agregar company si falta
        // --------------------------------------------

        const companyAlreadyAdded = owner.companies.some(
          (c) => c.id === companyId,
        );

        if (!companyAlreadyAdded) {
          owner.companies.push({ id: companyId } as any);
        }

        Object.assign(owner, data);

        await queryRunner.manager.save(owner);
      }

      // --------------------------------------------
      // 4. Verificar si ya tiene user en esta empresa
      // --------------------------------------------

      const existingUserForCompany = owner.users?.find(
        (user) => user.company!.id === companyId,
      );

      if (existingUserForCompany) {
        await queryRunner.commitTransaction();
        return owner;
      }

      // --------------------------------------------
      // 5. Validar email SOLO en esta empresa
      // --------------------------------------------

      const emailExists = await queryRunner.manager.findOne(User, {
        where: {
          email,
          company: { id: companyId },
        },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use for this company');
      }

      // --------------------------------------------
      // 6. Crear user para esta empresa
      // --------------------------------------------

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

      // --------------------------------------------
      // 7. Commit
      // --------------------------------------------

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
    try {
        const { bankAccount, ci, createUser, email, password, ...data } = dto;

      // --------------------------------------------
      // 1. Buscar si existe un owner con el mismo CI
      // --------------------------------------------

      let owner = await this.ownerRepository.findOne({
        where: { ci },
        relations: { companies: true, bankAccount: true },
      });

      // --------------------------------------------
      // 2. Si no existiera se crea uno nuevo owner
      // --------------------------------------------

      if (!owner) {
        owner = this.ownerRepository.create({
          ...data,
          ci,
          bankAccount, //* se crea la cuenta de banco
          companies: [{ id: companyId }], //* se asigna la primera compañía
        });

        return await this.ownerRepository.save(owner);
      }

      // --------------------------------------------
      // 3. Si ya existiera, se agrega la nueva company
      // --------------------------------------------

      const companyAlreadyAdded = owner.companies.some(
        (c) => c.id === companyId,
      );

      if (!companyAlreadyAdded) {
        owner.companies.push({ id: companyId } as any);
      }

      // --------------------------------------------
      // 4. Actualizar los datos del owner existente
      // --------------------------------------------

      Object.assign(owner, data);

      return await this.ownerRepository.save(owner);
    } catch (error) {
      handleDBExceptions(error);
    }
  } */

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number) {
    return await this.ownerRepository.find({
      where: {
        companies: { id: companyId },
        users: { company: { id: companyId } },
      },
      relations: {
        bankAccount: true,
        users: true,
        companies: true,
        buses: true,
      },
    });
  }

  /* async findAll(companyId: number) {
    return this.ownerRepository
      .createQueryBuilder('owner')
      .leftJoinAndSelect('owner.bankAccount', 'bankAccount')
      .leftJoinAndSelect('owner.users', 'users')
      .leftJoinAndSelect('owner.buses', 'bus', 'bus.companyId = :companyId', {
        companyId,
      })
      .leftJoin('owner.companies', 'company')
      .where('company.id = :companyId', { companyId })
      .getMany();
  } */

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const owner = await this.ownerRepository.findOne({
      where: { id, companies: { id: companyId } },
      relations: { bankAccount: true },
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

    // --------------------------------------------
    // 1.  buses asociados al owner en esa company
    // --------------------------------------------

    await this.busRepository
      .createQueryBuilder()
      .softDelete()
      .where('ownerId = :id', { id })
      .andWhere('companyId = :companyId', { companyId })
      .execute();

    // --------------------------------------------
    // 2. Delete de relación Owner - Company
    // --------------------------------------------

    await this.ownerRepository
      .createQueryBuilder()
      .relation(Owner, 'companies')
      .of(id)
      .remove(companyId);

    return { message: 'Owner deleted successfully', deleted: owner };
  }
}
