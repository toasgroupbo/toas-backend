import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';

import { CustomersModule } from '../customers/customers.module';
import { TicketsForCashiersController } from './tickets-for-cashiers.controller';
import { TravelsModule } from '../travels/travels.module';
import { TicketsInAppController } from './tickets-in-app.controller';

import { TicketsForCashierService } from './tickets-for-cashiers.service';
import { TicketsInAppService } from './tickets-in-app.service';

import { TicketExpirationService } from './services/ticket-expiration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket]),
    CustomersModule,
    forwardRef(() => TravelsModule),
  ],
  controllers: [
    TicketsController,
    TicketsInAppController,
    TicketsForCashiersController,
  ],
  providers: [
    TicketsService,
    TicketsInAppService,
    TicketsForCashierService,
    TicketExpirationService,
  ],
  exports: [TicketExpirationService, TicketsService],
})
export class TicketsModule {}
