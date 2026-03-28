import { Get, Post, Body, Param, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth, Resource } from 'src/auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { CustomersForCashierService } from './customers-for-cashiers.service';

//!
@Resource(ValidResourses.CUSTOMER_CASHIER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Customers: For Cashiers')
@Controller('customers/for-cashier')
export class CustomersForCashiersController {
  constructor(
    private readonly customersForCashierService: CustomersForCashierService,
  ) {}

  //? ============================================================================================== */
  //?                             FindOne_Passengers                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('passengers/:ci')
  findOne(@Param('ci') ci: string) {
    return this.customersForCashierService.findOne(ci);
  }
}
