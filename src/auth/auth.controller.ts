import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto';
import { ApiTags } from '@nestjs/swagger';
import { GoogleOauthGuard } from './guards';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Login                                                   */
  //? ---------------------------------------------------------------------------------------------- */

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.loginUser(loginUserDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                       Google                                                   */
  //? ---------------------------------------------------------------------------------------------- */

  //! redirecciona al inicio de session de google
  @Get('google')
  @UseGuards(GoogleOauthGuard)
  async auth() {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                              Google CallBack                                                   */
  //? ---------------------------------------------------------------------------------------------- */

  //! se ejecuta cuando google redirecciona al usuario de vuelta a la aplicacion
  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthCallback(@Req() req) {
    const customer = req.user; //!  (en passport siempre en req.user)

    return this.authService.signIn(customer);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Logout                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  /* @Post('logout')
  logout() {
    return this.authService.logout();
  } */

  //? ---------------------------------------------------------------------------------------------- */
  //?                                Refresh Token                                                   */
  //? ---------------------------------------------------------------------------------------------- */

  /* @Post('refresh-token')
  refreshToken() {
    return this.authService.refreshToken();
  } */
}
