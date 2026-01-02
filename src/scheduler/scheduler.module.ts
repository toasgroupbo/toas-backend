import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { TravelAutoCloseService } from './travel-auto-close.service';
import { ReservationCleanupService } from './reservation-cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TravelAutoCloseService, ReservationCleanupService],
})
export class SchedulerModule {}
