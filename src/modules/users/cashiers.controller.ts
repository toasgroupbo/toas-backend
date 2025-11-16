import {
  Post,
  Body,
  Param,
  Controller,
  ParseUUIDPipe,
  Put,
  Get,
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

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  //@ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Post()
  createCashier(@Body() createCashierDto: CreateUserCashierDto) {
    return this.usersService.createCashier(createCashierDto); //! GetCompany
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */
  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Get()
  findAll(@GetCompany() companyUUID: string) {
    return this.usersService.findAllCashiers(companyUUID); //! GetCompany
  }
  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCompany() companyUUID: string,
  ) {
    return this.usersService.findOneCashier(id, companyUUID); //! GetCompany
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                      Update_Office                                             */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Put('office/:id')
  updateOffice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserOfficeDto: UpdateUserOfficeDto,
    @GetCompany() companyUUID: string,
  ) {
    return this.usersService.updateOffice(id, updateUserOfficeDto, companyUUID); //! GetCompany
  }
}
