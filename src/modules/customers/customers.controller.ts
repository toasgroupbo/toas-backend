import {
  Get,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  Controller,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreatePassengerInAppDto, UpdateCustomerDto } from './dto';
import { CustomerPaginationDto } from './pagination/customer-pagination.dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetUser, Resource } from 'src/auth/decorators';

import { CustomersService } from './customers.service';
import { PassengersService } from './passengers.service';

import { Customer } from './entities/customer.entity';

//!
@Resource(ValidResourses.CUSTOMER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,

    private readonly passengersService: PassengersService,
  ) {}

  //? ============================================================================================== */
  //?                               Create_Passenger                                                 */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Post('passengers/in-app')
  createForApp(
    @Body() dto: CreatePassengerInAppDto,
    @GetUser() customer: Customer,
  ) {
    return this.passengersService.createInApp(dto, customer); //! GetUser
  }

  //? ============================================================================================== */
  //?                             FindAll_Passengers                                                 */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Get('passengers/in-app')
  findAllPassengers(@GetUser() customer: Customer) {
    return this.passengersService.findAllPassengersInApp(customer); //! GetUser
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'is_verified',
    required: false,
    type: Boolean,
  })
  @Get()
  findAll(@Query() pagination: CustomerPaginationDto) {
    return this.customersService.findAll(pagination);
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}
