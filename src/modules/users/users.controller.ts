import {
  Put,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetCompany, GetUser, Resource } from '../../auth/decorators';
import { TwoFactorEnabledGuard } from '../../auth/guards';
import { ValidResourses, ValidPermissions } from '../../common/enums';

import {
  CreateUserDto,
  UpdateUserDto,
  CreateUserAdminDto,
  UpdateUserPasswordDto,
  UpdateMyProfileDto,
  UpdateMyPasswordDto,
} from './dto';

import { User } from './entities/user.entity';
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

  //! solo para pruebas: es público (sin @Auth) y crea un SUPER_ADMIN, no debe quedar activo en producción
  /* @Post('super-admin')
  create(@Body() createUser: CreateUserDto) {
    return this.usersService.createAdmin(createUser);
  } */

  //? ============================================================================================== */

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
  //?                               Update_My_Profile                                                */
  //? ============================================================================================== */

  //! cualquier user del panel con 2FA activo + su contraseña. Van antes de las rutas ':id'
  //! para que 'me' no caiga en el ParseIntPipe
  @UseGuards(TwoFactorEnabledGuard)
  @Auth()
  //!
  @Patch('me')
  updateMyProfile(@Body() dto: UpdateMyProfileDto, @GetUser() user: User) {
    return this.usersService.updateMyProfile(user.id, dto);
  }

  //? ============================================================================================== */
  //?                               Update_My_Password                                               */
  //? ============================================================================================== */

  //! cierra todas las sesiones, también la actual
  @UseGuards(TwoFactorEnabledGuard)
  @Auth()
  //!
  @Patch('me/password')
  updateMyPassword(@Body() dto: UpdateMyPasswordDto, @GetUser() user: User) {
    return this.usersService.updateMyPassword(user.id, dto);
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  //! quien edita tiene que tener el 2FA activo (UseGuards va arriba de Auth para correr después)
  //! y confirmar con su contraseña (currentPassword)
  @UseGuards(TwoFactorEnabledGuard)
  @Auth(ValidPermissions.UPDATE)
  //!
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @GetUser() user: User,
  ) {
    return this.usersService.update(id, user.id, dto);
  }

  //? ============================================================================================== */
  //?                               Update_Cashiers                                                  */
  //? ============================================================================================== */

  //! quien edita tiene que tener el 2FA activo y confirmar con su contraseña
  @UseGuards(TwoFactorEnabledGuard)
  @Auth(ValidPermissions.UPDATE_CASHIERS)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Patch('cashiers/:id')
  updateCashiers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @GetCompany() companyId: number,
    @GetUser() user: User,
  ) {
    return this.usersService.updateCashiers(id, companyId, user.id, dto);
  }

  //? ============================================================================================== */
  //?                                Update_Password                                                 */
  //? ============================================================================================== */

  //! quien cambia la contraseña tiene que tener el 2FA activo y confirmar con su contraseña
  @UseGuards(TwoFactorEnabledGuard)
  @Auth(ValidPermissions.UPDATE)
  //!
  @Put(':id')
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserPasswordDto,
    @GetUser() user: User,
  ) {
    return this.usersService.updatePassword(id, user.id, dto);
  }

  //? ============================================================================================== */
  //?                               Reset_Two_Factor                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Patch(':id/2fa/reset')
  resetTwoFactor(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.resetTwoFactor(id);
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
