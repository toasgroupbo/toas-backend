import {
  Get,
  Post,
  Body,
  Controller,
  Patch,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  CreateOrUpdateBillingDto,
  CreatePassengerInAppDto,
  UpdateCustomerDto,
} from './dto';

import { ValidResourses } from 'src/common/enums';

import { IsVerifyGuard } from '../tickets/guards/is-verify.guard';

import { Auth, GetCustomer, Resource } from 'src/auth/decorators';

import { Customer } from './entities/customer.entity';

import { BillingsService } from './billings.service';
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
    return this.customerInAppService.me(customer); //! GetCustomer
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Patch()
  update(
    @Body() updateCustomerDto: UpdateCustomerDto,
    @GetCustomer() customer: Customer,
  ) {
    return this.customerInAppService.update(customer, updateCustomerDto); //! GetCustomer
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
    return this.customerInAppService.getPenalities(customer); //! GetCustomer
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
    return this.customerInAppService.deletePenalities(customer); //! GetCustomer
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
    @Body() createOrUpdateBillingDto: CreateOrUpdateBillingDto,
    @GetCustomer() customer: Customer,
  ) {
    return this.billingsSerrvices.createOrUpdateBilling(
      customer,
      createOrUpdateBillingDto,
    ); //! GetCustomer
  }

  //? ============================================================================================== */
  //?                               Create_Passenger                                                 */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Post('passengers')
  createPassenger(
    @Body() dto: CreatePassengerInAppDto,
    @GetCustomer() customer: Customer,
  ) {
    return this.customerInAppService.createPassenger(dto, customer); //! GetCustomer
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
    return this.customerInAppService.findAllPassengers(customer); //! GetCustomer
  }
}
