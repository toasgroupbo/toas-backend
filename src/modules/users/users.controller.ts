import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  Controller,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import {
  CreateUserAdminDto,
  CreateUserCashierDto,
  UpdateUserDto,
  UpdateUserOfficeDto,
} from './dto';

import { ValidResourses, ValidPermissions } from '../../common/enums';
import { Auth, Resource } from '../../auth/decorators';

import { UsersService } from './users.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@Resource(ValidResourses.USER)
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */
  //@Auth()

  @Post('admins')
  createAppAdmin(@Body() createUserAdminDto: CreateUserAdminDto) {
    return this.usersService.create(createUserAdminDto);
  }

  @Post('cashiers')
  createCashier(@Body() createCashierDto: CreateUserCashierDto) {
    return this.usersService.createCashier(createCashierDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  // solo users con permisos pero customers no
  //@Auth(ValidPermissions.READ)
  @Get()
  /* @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number }) */
  findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //solo users o customers autenticados
  //@Auth()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 Update Office                                                  */
  //? ---------------------------------------------------------------------------------------------- */

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

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
