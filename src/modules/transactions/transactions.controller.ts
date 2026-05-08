import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { TransactionsService } from './transactions.service';
import { Auth, Resource } from 'src/auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

//!
@Resource(ValidResourses.TRANSACTION)
@ApiBearerAuth('access-token')
//!
@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  //? ============================================================================================== ?/
  //?                              Process_Multiple                                                  ?/
  //? ============================================================================================== ?/

  //!
  @Auth(ValidPermissions.PAY)
  //!
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

  //!
  @Auth(ValidPermissions.PAY)
  //!
  @Post('verify/:transactionId')
  async verifyTransaction(
    @Param('transactionId', ParseIntPipe) transactionId: number,
  ) {
    return await this.transactionsService.verifyTransaction(transactionId);
  }
}
