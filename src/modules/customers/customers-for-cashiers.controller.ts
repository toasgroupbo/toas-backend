import { Get, Post, Body, Param, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateCustomerNotVerifiedDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, Resource } from 'src/auth/decorators';

import { CustomersService } from './customers.service';

//!
@Resource(ValidResourses.CASHIER_CUSTOMER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Customers: For Cashiers')
@Controller('customers/for-cashier')
export class CustomersForCashiersController {
  constructor(private readonly customersService: CustomersService) {}

  //? ============================================================================================== */
  //?                                         Create                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  createForCustomer(
    @Body() createCustomerNotVerifiedDto: CreateCustomerNotVerifiedDto,
  ) {
    return this.customersService.createNotVerified(
      createCustomerNotVerifiedDto,
    );
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':ci')
  findOneByCi(@Param('ci') ci: string) {
    return this.customersService.findOneByCi(ci);
  }
}
