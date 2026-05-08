import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  //? ============================================================================================== ?/
  //?                              Process_Multiple                                                  ?/
  //? ============================================================================================== ?/

  @Post('process/:travelId')
  async processTransaction(@Param('travelId', ParseIntPipe) travelId: number) {
    return this.transactionsService.processTransaction(travelId);
  }

  //? ============================================================================================== ?/
  //?                              Authorized_Batch                                                  ?/
  //? ============================================================================================== ?/

  /* @Post('authorize/:transactionId')
  async authorizeTransaction(
    @Param('transactionId', ParseIntPipe) transactionId: number,
  ) {
    return await this.transactionsService.authorizeTransaction(transactionId);
  }
 */
  //? ============================================================================================== ?/
  //?                              Get_Batch_Detail                                                  ?/
  //? ============================================================================================== ?/

  @Post('verify/:transactionId')
  async verifyTransaction(
    @Param('transactionId', ParseIntPipe) transactionId: number,
  ) {
    return await this.transactionsService.verifyTransaction(transactionId);
  }
}
