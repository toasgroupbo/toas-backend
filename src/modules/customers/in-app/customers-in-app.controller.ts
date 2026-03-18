import {
  Get,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  Controller,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { IsVerifyGuard } from '../../tickets/guards/is-verify.guard';
import { Auth, GetCustomer, Resource } from 'src/auth/decorators';
import { ValidResourses } from 'src/common/enums';

import { CreateOrUpdateBillingDto, UpdateCustomerDto } from '../dto';

import { Customer } from '../entities/customer.entity';

import { BillingsService } from '../billings.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { CustomersInAppService } from './customers-in-app.service';

//!
@Resource(ValidResourses.CUSTOMER_APP)
@ApiBearerAuth('access-token')
//!

@ApiTags('Customers: In App')
@Controller('customers/in-app')
export class CustomersInAppController {
  constructor(
    private readonly customerInAppService: CustomersInAppService,
    private readonly billingsSerrvices: BillingsService,
    private readonly walletService: WalletService,
  ) {}

  //? ============================================================================================== */
  //?                                    Get_Me                                                      */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('me')
  me(@GetCustomer() customer: Customer) {
    return this.customerInAppService.me(customer);
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Patch()
  update(@Body() dto: UpdateCustomerDto, @GetCustomer() customer: Customer) {
    return this.customerInAppService.update(customer, dto);
  }

  //? ============================================================================================== */
  //?                                 Get_Penalities                                                 */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('penalities')
  getPenalities(@GetCustomer() customer: Customer) {
    return this.customerInAppService.getPenalities(customer);
  }

  //? ============================================================================================== */
  //?                               Delete_Penalities                                                */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Delete('penalities')
  deletePenalities(@GetCustomer() customer: Customer) {
    return this.customerInAppService.deletePenalities(customer);
  }

  //? ============================================================================================== */
  //?                      Create_or_Update_Billing                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Post('billing')
  createOrUpdateBilling(
    @Body() dto: CreateOrUpdateBillingDto,
    @GetCustomer() customer: Customer,
  ) {
    return this.billingsSerrvices.createOrUpdateBilling(customer, dto);
  }

  //? ============================================================================================== */
  //?                             FindAll_Passengers                                                 */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('passengers')
  findAllPassengers(@GetCustomer() customer: Customer) {
    return this.customerInAppService.findAllPassengers(customer);
  }

  //? ============================================================================================== */
  //?                                   Get_Balance                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('balance')
  getBalance(@GetCustomer() customer: Customer) {
    return this.walletService.getAvailableBalance({ customer: customer });
  }

  //? ============================================================================================== */
  //?                           Get_Balance_History                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('balance/history')
  getBalanceHistory(@GetCustomer() customer: Customer) {
    return this.walletService.getBalanceHistory(customer);
  }
}
