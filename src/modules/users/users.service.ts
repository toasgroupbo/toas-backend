import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CreateUserAdminDto,
  CreateUserCashierDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateUserOfficeDto,
} from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';
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

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  // --------------------------------------------------------------------------
  // 1. Creacion de un usuario Super-Admin
  // --------------------------------------------------------------------------

  async createAdmin(createUserDto: CreateUserDto) {
    //! busqueda del rol de Super-Admin
    const rol = await this.rolService.findOneByName(StaticRoles.SUPER_ADMIN);
    if (!rol) {
      throw new NotFoundException('Role Super-User not found');
    }

    try {
      const newUser = this.userRepository.create({
        ...createUserDto,
        rol,
      });
      return await this.userRepository.save(newUser);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  // --------------------------------------------------------------------------
  // 2. Creacion de un usuario Admin-App
  // --------------------------------------------------------------------------

  async createAppAdmin(createUserDto: CreateUserAdminDto) {
    try {
      const newUser = this.userRepository.create({
        ...createUserDto,
        rol: { id: createUserDto.rol },
      });
      return await this.userRepository.save(newUser);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  // --------------------------------------------------------------------------
  // 3. Creacion de un usuario Cashier
  // --------------------------------------------------------------------------

  async createCashier(createUserDto: CreateUserCashierDto) {
    const { office, ...data } = createUserDto;
    //! busqueda del rol de Cashier
    const rol = await this.rolService.findOneByName(StaticRoles.CASHIER);
    if (!rol) {
      throw new NotFoundException('Role Cashier not found');
    }

    try {
      const newCashier = this.userRepository.create({
        ...data,
        rol,
        office: { id: office },
      });
      return await this.userRepository.save(newCashier);
    } catch (error) {
      handleDBExceptions(error);
    }
  }
  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll() {
    const users = await this.userRepository.find({
      relations: { rol: true, office: true, company: true },
    });
    return users;
  }

  // --------------------------------------------------------------------------

  async findAllCashiers(companyUUID: string) {
    const cashiers = await this.userRepository.find({
      where: { company: { id: companyUUID } },
      relations: { rol: true, office: true, company: true },
    });
    return cashiers;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { rol: true, office: true, company: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // --------------------------------------------------------------------------

  async findOneCashier(id: string, companyUUID: string) {
    const cashier = await this.userRepository.findOne({
      where: { id, company: { id: companyUUID } },
      relations: { rol: true, office: true, company: true },
    });
    if (!cashier) throw new NotFoundException('Cashier not found');
    return cashier;
  }

  // --------------------------------------------------------------------------

  async findById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { rol: true, company: true },
    });
    return user;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                     FindOneByEmail                                             */
  //? ---------------------------------------------------------------------------------------------- */

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.rol', 'rol')
      .leftJoinAndSelect('rol.permissions', 'permissions')
      .leftJoinAndSelect('user.company', 'company')
      .select([
        'user.id',
        'user.ci',
        'user.email',
        'user.fullName',
        'user.password',
        'rol.id',
        'rol.name',
        'rol.isStatic',
        'permissions.resourse',
        'permissions.permissions',
        'company.id',
      ])
      .where('user.email = :email', { email })
      .getOne();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.findOne(id);

      if (updateUserDto.rol) {
        const rol = await this.rolService.findOne(updateUserDto.rol);

        if (rol.isStatic) {
          throw new ConflictException('The Rol is Static');
        }
      }

      Object.assign(user, updateUserDto);
      return await this.userRepository.save(user);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async updateOffice(
    id: string,
    updateUserOfficeDto: UpdateUserOfficeDto,
    companyUUID: string,
  ) {
    try {
      const user = await this.findOneCashier(id, companyUUID);
      if (user.rol.name !== StaticRoles.CASHIER) {
        throw new NotFoundException('The user is not a Cashier');
      }

      Object.assign(user, {
        office: { id: updateUserOfficeDto.NewOfficeUUID },
      });

      return await this.userRepository.save(user);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.userRepository.softRemove(user);
    return {
      message: 'User deleted successfully',
      deleted: user,
    };
  }
}
