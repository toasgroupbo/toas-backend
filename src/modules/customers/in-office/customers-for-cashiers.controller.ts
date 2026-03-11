import { Get, Post, Body, Param, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth, Resource } from 'src/auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { CreateCustomerNotVerifiedDto } from '../dto';

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
  //?                                         Create                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() dto: CreateCustomerNotVerifiedDto) {
    return this.customersForCashierService.createNotVerified(dto);
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':ci')
  findOneByCi(@Param('ci') ci: string) {
    return this.customersForCashierService.findOneByCi(ci);
  }

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
