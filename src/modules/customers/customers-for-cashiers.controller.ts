import { Get, Post, Body, Param, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  CreateCustomerNotVerifiedDto,
  CreatePassengerInOfficeDto,
} from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, Resource } from 'src/auth/decorators';

import { CustomersService } from './customers.service';
import { PassengersService } from './passengers.service';

//!
@Resource(ValidResourses.CASHIER_CUSTOMER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Customers: For Cashiers')
@Controller('customers/for-cashier')
export class CustomersForCashiersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly passengersService: PassengersService,
  ) {}

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

  //? ============================================================================================== */
  //?                              Create_Passenger                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post('passengers')
  createForCashier(@Body() dto: CreatePassengerInOfficeDto) {
    return this.passengersService.createInOffice(dto);
  }

  //? ============================================================================================== */
  //?                             FindAll_Passengers                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('passengers/:customerId')
  findAllPassengers(@Param('customerId') customerId: number) {
    return this.passengersService.findAllPassengersInOffice(customerId);
  }
}
