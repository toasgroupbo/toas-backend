import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';

import { TravelsModule } from '../travels/travels.module';
import { CustomersModule } from '../customers/customers.module';

import { TicketsForCashiersController } from './in-office/tickets-for-cashiers.controller';
import { TicketsForCashierService } from './in-office/tickets-for-cashiers.service';

import { TicketsInAppController } from './in-app/tickets-in-app.controller';
import { TicketsInAppService } from './in-app/tickets-in-app.service';

import { TicketExpirationService } from './ticket-expiration.service';

import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket]),
    CustomersModule,
    forwardRef(() => TravelsModule),
    WalletModule,
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
