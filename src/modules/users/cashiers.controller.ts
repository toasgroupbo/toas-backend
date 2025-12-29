import {
  Put,
  Get,
  Post,
  Body,
  Param,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateUserCashierDto, UpdateUserOfficeDto } from './dto';

import { ValidResourses, ValidPermissions } from '../../common/enums';

import { Auth, GetCompany, Resource } from '../../auth/decorators';

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
  @Post()
  createCashier(@Body() createCashierDto: CreateUserCashierDto) {
    return this.usersService.createCashier(createCashierDto);
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */
  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Get()
  findAll(@GetCompany() companyId: number) {
    return this.usersService.findAllCashiers(companyId); //! GetCompany
  }
  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCompany() companyId: number,
  ) {
    return this.usersService.findOneCashier(id, companyId); //! GetCompany
  }

  //? ============================================================================================== */
  //?                                      Update_Office                                             */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Put('office/:id')
  updateOffice(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserOfficeDto: UpdateUserOfficeDto,
    @GetCompany() companyId: number,
  ) {
    return this.usersService.updateOffice(id, updateUserOfficeDto, companyId); //! GetCompany
  }
}
