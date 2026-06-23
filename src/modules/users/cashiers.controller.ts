import {
  Put,
  Get,
  Post,
  Body,
  Param,
  Query,
  Controller,
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from '../../auth/decorators';
import { ValidResourses, ValidPermissions } from '../../common/enums';

import { CreateUserCashierDto, UpdateUserOfficeDto } from './dto';

import { UsersService } from './users.service';

//!
@Resource(ValidResourses.CASHIER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Cashiers')
@Controller('cashiers')
export class CashiersController {
  constructor(private readonly usersService: UsersService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Post()
  createCashier(
    @Body() dto: CreateUserCashierDto,
    @GetCompany() companyId: number,
  ) {
    return this.usersService.createCashier(dto, companyId);
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */
  //!
  @Auth(ValidPermissions.READ_CASHIERS)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @Get()
  findAll(
    @GetCompany() companyId: number,
    @Query('enabled', new DefaultValuePipe(true), ParseBoolPipe) enabled: boolean,
  ) {
    return this.usersService.findAllCashiers(companyId, enabled);
  }
  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCompany() companyId: number,
  ) {
    return this.usersService.findOneCashier(id, companyId);
  }

  //? ============================================================================================== */
  //?                                      Update_Office                                             */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Put('office/:id')
  updateOffice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserOfficeDto,
    @GetCompany() companyId: number,
  ) {
    return this.usersService.updateOffice(id, dto, companyId);
  }
}
