import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateCustomerNotVerifiedDto, UpdateCustomerDto } from './dto';
import { CustomerPaginationDto } from './pagination/customer-pagination.dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, Resource } from 'src/auth/decorators';

import { CustomersService } from './customers.service';

//!
@Resource(ValidResourses.CUSTOMER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  //? ============================================================================================== */
  //?                                         Create                                                 */
  //? ============================================================================================== */

  //!
  @Resource(ValidResourses.CASHIER_CUSTOMER)
  @Auth(ValidPermissions.CREATE)
  //!
  @Post('for-cashier')
  createForCustomer(
    @Body() createCustomerNotVerifiedDto: CreateCustomerNotVerifiedDto,
  ) {
    return this.customersService.createNotVerified(
      createCustomerNotVerifiedDto,
    );
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

  //!
  @Resource(ValidResourses.CASHIER_CUSTOMER)
  @Auth(ValidPermissions.READ)
  //!
  @Get('for-cashier/:ci')
  findOneByCi(@Param('ci') ci: string) {
    return this.customersService.findOneByCi(ci);
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
