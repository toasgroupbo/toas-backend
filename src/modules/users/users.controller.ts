import {
  Put,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth, Resource } from '../../auth/decorators';
import { ValidResourses, ValidPermissions } from '../../common/enums';

import {
  CreateUserDto,
  UpdateUserDto,
  CreateUserAdminDto,
  UpdateUserPasswordDto,
} from './dto';

import { UsersService } from './users.service';

//!
@Resource(ValidResourses.USER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  @Post('super-admin')
  create(@Body() createUser: CreateUserDto) {
    return this.usersService.createAdmin(createUser);
  }

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post('admins')
  createAppAdmin(@Body() dto: CreateUserAdminDto) {
    return this.usersService.createAppAdmin(dto);
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  //? ============================================================================================== */
  //?                                Update_Password                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Put(':id')
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserPasswordDto,
  ) {
    return this.usersService.changePassword(id, dto);
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
