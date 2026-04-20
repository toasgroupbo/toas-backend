import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoutesModule } from '../routes/routes.module';
import { OwnersModule } from '../owners/owners.module';
import { TicketsModule } from '../tickets/tickets.module';

import { TravelsController } from './travels.controller';
import { TravelsInAppController } from './in-app/travels-in-app.controller';
import { TravelsForCashiersController } from './in-office/travels-for-cashiers.controller';

import { StaffService } from './staff.service';
import { TravelsService } from './travels.service';
import { TravelsInAppService } from './in-app/travels-in-app.service';
import { TravelsForCashierService } from './in-office/travels-for-cashiers.service';

import { Staff } from './entities/staff.entity';
import { Travel } from './entities/travel.entity';
import { TravelSeat } from './entities/travel-seat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Travel, TravelSeat, Staff]),
    RoutesModule,

    OwnersModule,

    forwardRef(() => TicketsModule),
  ],
  controllers: [
    TravelsController,
    TravelsInAppController,
    TravelsForCashiersController,
  ],
  providers: [
    TravelsService,
    TravelsForCashierService,
    TravelsInAppService,
    StaffService,
  ],
  exports: [TravelsService, TypeOrmModule],
})
export class TravelsModule {}
