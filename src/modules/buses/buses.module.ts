import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';

import { BusesForCashiersController } from './in-office/buses-for-cashiers.controller';
import { BusesForCashierService } from './in-office/buses-for-cashiers.service';

import { Bus } from './entities/bus.entity';
import { BusType } from './entities/bus-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bus, BusType])],
  controllers: [BusesController, BusesForCashiersController],
  providers: [BusesService, BusesForCashierService],
  exports: [TypeOrmModule, BusesService],
})
export class BusesModule {}
