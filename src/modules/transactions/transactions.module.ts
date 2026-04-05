import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TransactionsController } from './transactions.controller';

import { Transaction } from './entities/transaction.entity';
import { CryptoService } from './crypto.service';
import { CryptoController } from './crypto.controller';
import { HttpController } from './http.controller';
import { HttpService } from './http/http.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [TransactionsController, CryptoController, HttpController],
  providers: [CryptoService, HttpService /* TransactionsService */],
})
export class TransactionsModule {}
