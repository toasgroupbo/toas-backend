import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ValidPermissions, ValidResourses } from 'src/common/enums';
import { StaticRoles } from 'src/auth/enums/roles.enum';

import { Rol } from '../roles/entities/rol.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  // --------------------------------------------------------------------------
  // -- On Module Init
  // --------------------------------------------------------------------------

  async onModuleInit() {
    await this.seedRolesAndPermissions();
  }

  private async seedRolesAndPermissions() {
    const staticRoles = [
      //! SUPER-ADMIN

      {
        name: StaticRoles.SUPER_ADMIN,
        isStatic: true,
        permissions: [
          {
            resourse: ValidResourses.ROL,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.COMPANY,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.USER,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.CUSTOMER,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.OFFICE,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.OWNER,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.ROUTE,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.BUS,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.TRAVEL,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.CASHIER,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.FILE,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.BANK_ACCOUNT,
            permissions: [
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.PLACE,
            permissions: [ValidPermissions.CREATE, ValidPermissions.DELETE],
          },

          {
            resourse: ValidResourses.TICKET,
            permissions: [ValidPermissions.READ],
          },
        ],
      },

      //! COMPANY-ADMIN

      {
        name: StaticRoles.COMPANY_ADMIN,
        isStatic: true,
        permissions: [
          {
            resourse: ValidResourses.OFFICE,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.OWNER,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.BUS,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.ROUTE,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.TRAVEL,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
              ValidPermissions.CLOSE,
              ValidPermissions.CANCEL,
            ],
          },

          {
            resourse: ValidResourses.CASHIER,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.DELETE,
            ],
          },

          {
            resourse: ValidResourses.FILE,
            permissions: [ValidPermissions.CREATE, ValidPermissions.DELETE],
          },

          {
            resourse: ValidResourses.TICKET,
            permissions: [ValidPermissions.READ],
          },
        ],
      },

      //! CASHIER

      {
        name: StaticRoles.CASHIER,
        isStatic: true,
        permissions: [
          {
            resourse: ValidResourses.TRAVEL_CASHIER,
            permissions: [ValidPermissions.READ, ValidPermissions.CLOSE],
          },

          {
            resourse: ValidResourses.TICKET_CASHIER,
            permissions: [
              ValidPermissions.CREATE,
              ValidPermissions.READ,
              ValidPermissions.UPDATE,
              ValidPermissions.CONFIRM,
              ValidPermissions.CANCEL,
            ],
          },

          {
            resourse: ValidResourses.CUSTOMER_CASHIER,
            permissions: [ValidPermissions.CREATE, ValidPermissions.READ],
          },
        ],
      },
    ];

    // --------------------------------------------------------------------------
    // 1.  Se buscan los roles estáticos en la base de datos
    // --------------------------------------------------------------------------

    for (const roleData of staticRoles) {
      let role = await this.rolRepository.findOne({
        where: { name: roleData.name },
        relations: ['permissions'],
      });

      if (!role) {
        role = this.rolRepository.create({
          name: roleData.name,
          isStatic: roleData.isStatic,
        });
        role = await this.rolRepository.save(role);
        role.permissions = [];
        console.log(`✅ Rol creado: ${roleData.name}`);
      }

      // --------------------------------------------------------------------------
      // 2.  Se sincronizan los permisos para cada rol
      // --------------------------------------------------------------------------

      for (const { resourse, permissions } of roleData.permissions) {
        let existing = role.permissions.find((p) => p.resourse === resourse);

        if (!existing) {
          existing = this.permissionRepository.create({
            resourse,
            permissions,
            rol: role,
          });
          await this.permissionRepository.save(existing);
          console.log(`🆕 Permiso creado para ${role.name}: ${resourse}`);
        } else {
          const changed =
            permissions.sort().join(',') !==
            existing.permissions.sort().join(',');
          if (changed) {
            existing.permissions = permissions;
            await this.permissionRepository.save(existing);
            console.log(
              `🔄 Permiso actualizado para ${role.name}: ${resourse}`,
            );
          }
        }
      }

      // --------------------------------------------------------------------------
      // 3.  Se eliminan permisos obsoletos para cada rol
      // --------------------------------------------------------------------------

      const validResources = roleData.permissions.map((p) => p.resourse);
      const obsolete = role.permissions.filter(
        (p) => !validResources.includes(p.resourse as ValidResourses), //! por el error
      );
      if (obsolete.length > 0) {
        await this.permissionRepository.remove(obsolete);
        console.log(
          `🗑️ Eliminados permisos obsoletos de ${role.name}: ${obsolete
            .map((p) => p.resourse)
            .join(', ')}`,
        );
      }
    }

    console.log('✅ Seed completado correctamente');
  }
}
