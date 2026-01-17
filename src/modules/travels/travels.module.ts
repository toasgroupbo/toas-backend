import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TravelsController } from './travels.controller';
import { TravelsService } from './travels.service';
import { Travel } from './entities/travel.entity';

import { TravelSeat } from './entities/travel-seat.entity';

import { TravelsForCashiersController } from './travels-for-cashiers.controller';
import { TravelsForCashierService } from './travels-for-cashiers.service';

import { TravelsInAppController } from './travels-in-app.controller';
import { TravelsInAppService } from './travels-in-app.service';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Travel, TravelSeat]), RoutesModule],
  controllers: [
    TravelsController,
    TravelsInAppController,
    TravelsForCashiersController,
  ],
  providers: [TravelsService, TravelsForCashierService, TravelsInAppService],
  exports: [TravelsService, TypeOrmModule],
})
export class TravelsModule {}
