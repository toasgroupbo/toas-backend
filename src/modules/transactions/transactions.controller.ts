import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('process')
  async processTransactions() {
    await this.transactionsService.processTransactions();
    return {
      message: 'Transactions processed',
    };
  }

  @Post('authorize')
  async authorizeTransactions() {
    await this.transactionsService.authorizeTransactions();
    return {
      message: 'Transactions authorized',
    };
  }

  @Post('sync')
  async syncTransactions() {
    await this.transactionsService.syncBatchResults();
    return {
      message: 'GetBatchDetail ejecutado',
    };
  }
}
