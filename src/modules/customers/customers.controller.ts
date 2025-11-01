import {
  Post,
  Get,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';
import { Auth, Resource } from 'src/auth/decorators';

import { CustomersService } from './customers.service';
import { CustomerPaginationDto } from './pagination/customer-pagination.dto';

@ApiTags('Customers')
@Resource(ValidResourses.CUSTOMER) //! recurso
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //@ApiBearerAuth('access-token')
  //@Auth() //! debe estar autenticado
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

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */
  @ApiBearerAuth('access-token')
  @Auth()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @ApiBearerAuth('access-token')
  @Auth(ValidPermissions.UPDATE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */
  @ApiBearerAuth('access-token')
  @Auth(ValidPermissions.DELETE)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(id);
  }
}
