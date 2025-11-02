import {
  Post,
  Body,
  Param,
  Controller,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateUserCashierDto, UpdateUserOfficeDto } from './dto';

import { ValidResourses, ValidPermissions } from '../../common/enums';

import { Auth, Resource } from '../../auth/decorators';

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
  @Post()
  createCashier(@Body() createCashierDto: CreateUserCashierDto) {
    return this.usersService.createCashier(createCashierDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //? ---------------------------------------------------------------------------------------------- */
  //?                                      Update_Office                                             */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.PUT)
  //!
  @Put('office/:id')
  updateOffice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserOfficeDto: UpdateUserOfficeDto,
  ) {
    return this.usersService.updateOffice(id, updateUserOfficeDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */
}
