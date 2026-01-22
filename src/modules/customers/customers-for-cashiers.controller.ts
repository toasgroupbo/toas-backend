import { Get, Post, Body, Param, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  CreateCustomerNotVerifiedDto,
  CreatePassengerInOfficeDto,
} from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, Resource } from 'src/auth/decorators';

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
  create(@Body() createCustomerNotVerifiedDto: CreateCustomerNotVerifiedDto) {
    return this.customersForCashierService.createNotVerified(
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
    return this.customersForCashierService.findOneByCi(ci);
  }

  //? ============================================================================================== */
  //?                              Create_Passenger                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post('passengers')
  createPassenger(@Body() dto: CreatePassengerInOfficeDto) {
    return this.customersForCashierService.createPassenger(dto);
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
