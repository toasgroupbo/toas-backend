import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StaticRoles } from 'src/auth/enums/roles.enum';

import { Rol } from '../roles/entities/rol.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
    //await this.seedSuperAdmin();
  }

  private async seedRoles() {
    const staticRoles = [
      { name: StaticRoles.SUPER_ADMIN, isStatic: true },
      { name: StaticRoles.COMPANY_ADMIN, isStatic: true },
      { name: StaticRoles.CASHIER, isStatic: true },
    ];

    for (const role of staticRoles) {
      const exists = await this.rolRepository.findOne({
        where: { name: role.name },
      });
      if (!exists) {
        await this.rolRepository.save(this.rolRepository.create(role));
        console.log(`Rol created: ${role.name}`);
      }
    }
  }

  /* private async seedSuperAdmin() {
    const superRole = await this.roleRepo.findOne({
      where: { name: StaticRoles.SUPER_ADMIN },
    });

    const exists = await this.userRepo.findOne({
      where: { email: 'superadmin@system.com' },
    });

    if (!exists) {
      const passwordHash = await bcrypt.hash('123456', 10); // 👈 cámbialo en producción
      const user = this.userRepo.create({
        email: 'superadmin@system.com',
        passwordHash,
        role: superRole,
      });
      await this.userRepo.save(user);
      console.log('👑 SuperAdmin creado: superadmin@system.com / 123456');
    }
  } */
}
