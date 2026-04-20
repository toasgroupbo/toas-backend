import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';
import { Owner } from './entities/owner.entity';

import { BusesModule } from '../buses/buses.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [TypeOrmModule.forFeature([Owner]), BusesModule, RolesModule],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService, TypeOrmModule],
})
export class OwnersModule {}
