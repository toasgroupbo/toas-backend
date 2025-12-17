import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

import { CashiersController } from './cashiers.controller';

import { AuthModule } from '../../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { BusesModule } from '../buses/buses.module';
import { TravelsModule } from '../travels/travels.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthModule),

    RolesModule,

    BusesModule,

    TravelsModule,
  ],
  controllers: [UsersController, CashiersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
