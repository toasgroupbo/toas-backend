import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

/* import { TransactionsController } from './transactions.controller'; */

/* import { CryptoService } from './crypto.service';
import { HttpService } from './http/http.service';
import { TransactionsService } from './transactions.service'; */

import { Transaction } from './entities/transaction.entity';

import { TravelsModule } from '../travels/travels.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction]), TravelsModule],
  controllers: [
    /* TransactionsController */
  ],
  providers: [
    /* CryptoService, HttpService, TransactionsService */
  ],
})
export class TransactionsModule {}
