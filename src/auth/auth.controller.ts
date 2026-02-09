import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { GoogleLoginDto, LoginCustomerDto, LoginUserDto } from './dto';

import { GoogleOauthGuard } from './guards';

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
  //?                                       Google                                                   */
  //? ============================================================================================== */

  //! redirecciona al inicio de session de google
  @Get('google')
  @UseGuards(GoogleOauthGuard)
  async auth() {}

  //? ============================================================================================== */
  //?                              Google_CallBack                                                   */
  //? ============================================================================================== */

  //! se ejecuta cuando google redirecciona al usuario de vuelta a la aplicacion
  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthCallback(@Req() req) {
    const customer = req.user; //!  (en passport siempre en req.user)

    return this.authService.signIn(customer);
  }

  //? ============================================================================================== */
  //?                                        Logout                                                  */
  //? ============================================================================================== */

  /* @Post('logout')
  logout() {
    return this.authService.logout();
  } */

  //? ============================================================================================== */
  //?                               Login_Customer                                                   */
  //? ============================================================================================== */

  @Post('login/customer')
  loginCustomer(@Body() dto: LoginCustomerDto) {
    return this.authService.loginCustomer(dto.email);
  }

  //? ============================================================================================== */
  //?                                        Google                                                  */
  //? ============================================================================================== */

  @Post('google/verify')
  googleVerify(@Body() dto: GoogleLoginDto) {
    return this.authService.googleVerify(dto.idToken);
  }
}
