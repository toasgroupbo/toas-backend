import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Rol } from './entities/rol.entity';

import { Permission } from './entities/permission.entity';

import { AuthModule } from '../../auth/auth.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rol, Permission]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RolesController],
  providers: [RolesService, SeedService],
  exports: [TypeOrmModule, RolesService],
})
export class RolesModule {}
