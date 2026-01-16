import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ReservationCleanupService } from './reservation-cleanup.service';
import { CustomersModule } from 'src/modules/customers/customers.module';

@Module({
  imports: [ScheduleModule.forRoot(), CustomersModule],
  providers: [ReservationCleanupService],
})
export class SchedulerModule {}
