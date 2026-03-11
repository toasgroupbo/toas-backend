import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import {
  CreateUserDto,
  UpdateUserDto,
  CreateUserAdminDto,
  UpdateUserOfficeDto,
  CreateUserCashierDto,
  UpdateUserPasswordDto,
} from './dto';

import { StaticRoles } from 'src/auth/enums/roles.enum';

import { RolesService } from '../roles/roles.service';

import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly rolService: RolesService,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async createAdmin(dto: CreateUserDto) {
    //! busqueda del rol de Super-Admin
    const rol = await this.rolService.findOneByName(StaticRoles.SUPER_ADMIN);
    if (!rol) {
      throw new NotFoundException('Role Super-User not found');
    }

    try {
      const newUser = this.userRepository.create({
        ...dto,
        rol,
      });
      return await this.userRepository.save(newUser);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */

  async createAppAdmin(dto: CreateUserAdminDto) {
    try {
      const newUser = this.userRepository.create({
        ...dto,
        rol: { id: dto.rol },
      });
      return await this.userRepository.save(newUser);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */

  async createCashier(dto: CreateUserCashierDto) {
    const { officeId, ...data } = dto;
    //! busqueda del rol de Cashier
    const rol = await this.rolService.findOneByName(StaticRoles.CASHIER);
    if (!rol) {
      throw new NotFoundException('Role Cashier not found');
    }

    try {
      const newCashier = this.userRepository.create({
        ...data,
        rol,
        office: { id: officeId },
      });
      return await this.userRepository.save(newCashier);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll() {
    const users = await this.userRepository.find({
      where: { rol: { isStatic: false } },
      relations: { rol: true, office: true, company: true },
    });
    return users;
  }

  //? ============================================================================================== */

  async findAllCashiers(companyId: number) {
    const cashiers = await this.userRepository.find({
      where: {
        office: { company: { id: companyId } },
        rol: { name: StaticRoles.CASHIER },
      },
      relations: { rol: true, office: true, company: true },
    });
    return cashiers;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { rol: true, office: { company: true }, company: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  //? ============================================================================================== */

  async findOneCashier(id: number, companyId: number) {
    const cashier = await this.userRepository.findOne({
      where: { id, office: { company: { id: companyId } } },
      relations: { rol: true, office: true, company: true },
    });
    if (!cashier) throw new NotFoundException('Cashier not found');
    return cashier;
  }

  //? ============================================================================================== */

  async findById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { rol: true, company: true },
    });
    return user;
  }

  //? ============================================================================================== */
  //?                                     FindOneByEmail                                             */
  //? ============================================================================================== */

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.rol', 'rol')
      .leftJoinAndSelect('rol.permissions', 'permissions')
      .leftJoinAndSelect('user.company', 'company')
      .leftJoinAndSelect('user.office', 'office')
      .leftJoinAndSelect('office.place', 'place')
      .select([
        'user.id',
        'user.ci',
        'user.email',
        'user.fullName',
        'user.password',
        'user.phone',
        'rol.id',
        'rol.name',
        'rol.isStatic',
        'permissions.resourse',
        'permissions.permissions',
        'company.id',
        'office.id',
        'place.id',
      ])
      .where('user.email = :email', { email })
      .getOne();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateUserDto) {
    try {
      const user = await this.findOne(id);

      if (dto.rol) {
        const rol = await this.rolService.findOne(dto.rol);

        // --------------------------------------------
        // 1. No se puede asignar un rol estatico
        // --------------------------------------------

        if (rol.isStatic) {
          throw new ConflictException('The Rol is Static');
        }

        const allowed: StaticRoles[] = [
          StaticRoles.SUPER_ADMIN,
          StaticRoles.COMPANY_ADMIN,
          StaticRoles.CASHIER,
        ];

        // --------------------------------------------
        // 2. No se puede asignar un rol a un user estatico
        // --------------------------------------------

        if (allowed.includes(user.rol.name as StaticRoles)) {
          throw new ConflictException('The User is Static');
        }
      }

      Object.assign(user, dto);
      return await this.userRepository.save(user);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                               Update_password                                                  */
  //? ============================================================================================== */

  async changePassword(id: number, dto: UpdateUserPasswordDto) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');

    user.password = await bcrypt.hash(dto.password, 10);
    return this.userRepository.save(user);
  }

  //? ============================================================================================== */
  //?                                 Update_Office                                                  */
  //? ============================================================================================== */

  async updateOffice(id: number, dto: UpdateUserOfficeDto, companyId: number) {
    try {
      const user = await this.findOneCashier(id, companyId);
      if (user.rol.name !== StaticRoles.CASHIER) {
        throw new NotFoundException('The user is not a Cashier');
      }

      Object.assign(user, {
        office: { id: dto.NewOfficeId },
      });

      return await this.userRepository.save(user);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number) {
    const user = await this.findOne(id);

    if (user.rol.isStatic) {
      throw new ConflictException('The User is Static and cannot be deleted');
    }

    await this.userRepository.softRemove(user);
    return {
      message: 'User deleted successfully',
      deleted: user,
    };
  }
}
