import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Controller,
  ParseUUIDPipe,
  Put,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  CreateUserAdminDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPasswordDto,
} from './dto';

import { ValidResourses, ValidPermissions } from '../../common/enums';

import { Auth, Resource } from '../../auth/decorators';

import { UsersService } from './users.service';

//!
@Resource(ValidResourses.USER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @Post('super-admin')
  create(@Body() createUser: CreateUserDto) {
    return this.usersService.createAdmin(createUser);
  }

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post('admins')
  createAppAdmin(@Body() createUserAdminDto: CreateUserAdminDto) {
    return this.usersService.createAppAdmin(createUserAdminDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                Update_Password                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Put(':id')
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
  ) {
    return this.usersService.changePassword(id, updateUserPasswordDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
