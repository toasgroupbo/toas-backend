import {
  Get,
  Post,
  Param,
  Query,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';

import { TravelStatus } from '../travels/enums';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { TravelPaginationDto } from '../travels/pagination';

import { TransactionsService } from './transactions.service';

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
  }*/

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

  //? ============================================================================================== ?/
  //?                             FindAll_Companies                                                  ?/
  //? ============================================================================================== ?/

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('companies')
  findAll() {
    return this.transactionsService.findAllCompanies();
  }

  //? ============================================================================================== ?/
  //?                               FindAll_Travels                                                  ?/
  //? ============================================================================================== ?/

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @ApiQuery({
    name: 'origin_placeId',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'destination_placeId',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TravelStatus,
  })
  @ApiQuery({
    name: 'isPaid',
    required: false,
    type: Boolean,
  })
  @Get('travels')
  findAllForAdmin(
    @Query() pagination: TravelPaginationDto,
    @GetCompany() companyId: number,
  ) {
    return this.transactionsService.findAllTravels(pagination, companyId);
  }
}
