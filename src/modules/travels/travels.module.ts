import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TravelsController } from './travels.controller';
import { TravelsService } from './travels.service';
import { Travel } from './entities/travel.entity';

import { TravelSeat } from './entities/travel-seat.entity';

import { TravelsForCashiersController } from './in-office/travels-for-cashiers.controller';
import { TravelsForCashierService } from './in-office/travels-for-cashiers.service';

import { TravelsInAppController } from './in-app/travels-in-app.controller';
import { TravelsInAppService } from './in-app/travels-in-app.service';

import { TicketsModule } from '../tickets/tickets.module';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Travel, TravelSeat]),
    RoutesModule,

    forwardRef(() => TicketsModule),
  ],
  controllers: [
    TravelsController,
    TravelsInAppController,
    TravelsForCashiersController,
  ],
  providers: [TravelsService, TravelsForCashierService, TravelsInAppService],
  exports: [TravelsService, TypeOrmModule],
})
export class TravelsModule {}
