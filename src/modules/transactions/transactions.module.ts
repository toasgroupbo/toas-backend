import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TravelsModule } from '../travels/travels.module';
import { CompaniesModule } from '../companies/companies.module';

import { TransactionsController } from './transactions.controller';

import { CryptoService } from './crypto.service';
import { HttpService } from './http/http.service';
import { TransactionsService } from './transactions.service';

import { Transaction } from './entities/transaction.entity';
import { TicketExpirationService } from '../tickets/ticket-expiration.service';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    TravelsModule,
    CompaniesModule,
    TicketsModule,
  ],
  controllers: [TransactionsController],
  providers: [CryptoService, HttpService, TransactionsService],
})
export class TransactionsModule {}
