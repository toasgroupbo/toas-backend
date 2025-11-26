import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';
import { Bus } from './entities/bus.entity';

import { BusType } from './entities/bus-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bus, BusType])],
  controllers: [BusesController],
  providers: [BusesService],
  exports: [TypeOrmModule],
})
export class BusesModule {}
