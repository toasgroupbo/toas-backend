import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import {
  AppleLoginDto,
  ForgotPasswordDto,
  GenerateTwoFactorDto,
  GoogleLoginDto,
  LoginCustomerDto,
  LoginUserDto,
  RegisterCustomerDto,
  ResetPasswordDto,
  TwoFactorCodeDto,
  VerifyTwoFactorLoginDto,
} from './dto';

import { Auth, GetUser } from './decorators';
import { GoogleOauthGuard } from './guards';

import { User } from 'src/modules/users/entities/user.entity';

import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  //? ============================================================================================== */
  //?                                        Login                                                   */
  //? ============================================================================================== */

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.loginUser(loginUserDto);
  }

  //? ============================================================================================== */
  //?                                   Login_2FA                                                    */
  //? ============================================================================================== */

  //! segundo paso del login cuando el user tiene 2FA activo. Máx. 5 intentos por minuto por IP
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login/2fa')
  verifyTwoFactorLogin(@Body() dto: VerifyTwoFactorLoginDto) {
    return this.authService.verifyTwoFactorLogin(dto);
  }

  //? ============================================================================================== */
  //?                                         2FA                                                    */
  //? ============================================================================================== */

  //! autoservicio: cualquier user logueado, sin permiso especial

  @Auth()
  @ApiBearerAuth('access-token')
  @Post('2fa/generate')
  generateTwoFactor(@Body() dto: GenerateTwoFactorDto, @GetUser() user: User) {
    return this.authService.generateTwoFactorSecret(user.id, dto.password);
  }

  @Auth()
  @ApiBearerAuth('access-token')
  @Post('2fa/enable')
  enableTwoFactor(@Body() dto: TwoFactorCodeDto, @GetUser() user: User) {
    return this.authService.enableTwoFactor(user.id, dto.code);
  }

  @Auth()
  @ApiBearerAuth('access-token')
  @Post('2fa/disable')
  disableTwoFactor(@Body() dto: TwoFactorCodeDto, @GetUser() user: User) {
    return this.authService.disableTwoFactor(user.id, dto.code);
  }

  //? ============================================================================================== */
  //?                                 Forgot_Password                                                */
  //? ============================================================================================== */

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  //? ============================================================================================== */
  //?                                  Reset_Password                                                */
  //? ============================================================================================== */

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  //? ============================================================================================== */
  //?                                       Google                                                   */
  //? ============================================================================================== */

  //! redirecciona al inicio de session de google
  /* @Get('google')
  @UseGuards(GoogleOauthGuard)
  async auth() {} */

  //? ============================================================================================== */
  //?                              Google_CallBack                                                   */
  //? ============================================================================================== */

  //! se ejecuta cuando google redirecciona al usuario de vuelta a la aplicacion
  /* @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthCallback(@Req() req) {
    const customer = req.user;
    return this.authService.signIn(customer);
  } */

  //? ============================================================================================== */
  //?                                        Logout                                                  */
  //? ============================================================================================== */

  /* @Post('logout')
  logout() {
    return this.authService.logout();
  } */

  //? ============================================================================================== */
  //?                                        Guest                                                   */
  //? ============================================================================================== */

  //! token de invitado para la app: ver rutas y viajes sin cuenta (no puede reservar)
  @Post('guest')
  getTokenGuest() {
    return this.authService.getTokenGuest();
  }

  //? ============================================================================================== */
  //?                               Login_Customer                                                   */
  //? ============================================================================================== */

  @Post('login/customer')
  loginCustomer(@Body() dto: LoginCustomerDto) {
    return this.authService.loginCustomer(dto);
  }

  //? ============================================================================================== */
  //?                          Register_Customer (solo pruebas Android)                               */
  //? ============================================================================================== */

  //! endpoint temporal solo para pruebas de Android, luego se comenta
  @Post('register/customer')
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomerWithPassword(dto);
  }

  //? ============================================================================================== */
  //?                                        Google                                                  */
  //? ============================================================================================== */

  @Post('google/verify')
  googleVerify(@Body() dto: GoogleLoginDto) {
    return this.authService.googleVerify(dto.idToken);
  }

  //? ============================================================================================== */
  //?                                         Apple                                                  */
  //? ============================================================================================== */

  @Post('apple/verify')
  appleVerify(@Body() dto: AppleLoginDto) {
    return this.authService.appleVerify(dto);
  }
}
