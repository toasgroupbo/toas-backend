import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { CreateRoleDto, UpdateRoleDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Permission } from './entities/permission.entity';
import { Rol } from './entities/rol.entity';
import { StaticRoles } from 'src/auth/enums';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,

    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(createRoleDto: CreateRoleDto) {
    try {
      const { permissions = [], ...data } = createRoleDto;

      const newRole = this.rolRepository.create({
        ...data,
        permissions: permissions.map((permission) =>
          this.permissionsRepository.create(permission),
        ),
      });

      return await this.rolRepository.save(newRole);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll() {
    const roles = await this.rolRepository.find({
      where: { isStatic: false },
      relations: { permissions: true },
    });
    return roles;
  }

  //? ============================================================================================== */
  //?                               FindAll_Cashiers                                                 */
  //? ============================================================================================== */

  async findAllCashiers() {
    const roles = await this.rolRepository.find({
      where: {
        name: In([
          StaticRoles.CASHIER,
          StaticRoles.CASHIER_TRIPS,
          StaticRoles.CASHIER_SELLER,
        ]),
      },
      relations: { permissions: true },
    });

    return roles;
  }
  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number) {
    const role = await this.rolRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });

    if (!role) {
      throw new NotFoundException(`Role not found`);
    }

    return role;
  }

  //? ============================================================================================== */
  //?                                  FindOnebyName                                                 */
  //? ============================================================================================== */

  async findOneByName(name: string) {
    const role = await this.rolRepository.findOne({
      where: { name },
    });
    return role;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const { permissions, ...toUpdate } = updateRoleDto;

    const rol = await this.rolRepository.preload({
      id,
      ...toUpdate,
    });

    if (!rol) throw new NotFoundException('Rol not found');

    //! Validar si el rol es estático
    if (rol.isStatic) {
      throw new ConflictException('The Role is immutable');
    }

    //! inicia la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (permissions && permissions.length > 0) {
        await queryRunner.manager.delete(Permission, {
          rol: { id: id },
        });
        rol.permissions = permissions.map((role_permission) =>
          this.permissionsRepository.create(role_permission),
        );
      } else {
        rol.permissions = [];
      }

      await queryRunner.manager.save(rol);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      //! Fin de la transacción
      const fullRol = await this.findOne(rol.id);

      return fullRol;
    } catch (error) {
      //! Si ocurre un error, se hace rollback de la transacción
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number) {
    const rol = await this.rolRepository.findOne({
      where: { id },
      relations: {
        users: true,
      },
    });

    if (!rol) throw new NotFoundException();

    if (rol.isStatic) {
      throw new ConflictException('The Role is immutable');
    }

    await this.dataSource.transaction(async (manager) => {
      if (rol.users?.length) {
        await manager.softRemove(rol.users);
      }

      await manager.softRemove(rol);
    });

    return { deleted: rol, message: 'Rol deleted successfully' };
  }
}
