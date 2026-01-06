import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ReservationCleanupService } from './reservation-cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ReservationCleanupService],
})
export class SchedulerModule {}
