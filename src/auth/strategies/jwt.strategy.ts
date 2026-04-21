import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { envs } from '../../config/environments/environments';

import { LoginType } from '../../common/enums/login-type.enum';
import { IJwtPayload } from '../interfaces/jwt-payload.interface';

import { UsersService } from '../../modules/users/users.service';
import { CustomersService } from '../../modules/customers/customers.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UsersService,
    private readonly customerService: CustomersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: envs.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, jwtPayload: IJwtPayload) {
    const { id, type } = jwtPayload;

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (type === LoginType.user) {
      const userForLogin = await this.userService.findOneForLogin(id);
      if (!userForLogin)
        throw new UnauthorizedException('Token inválido (user)');

      if (userForLogin.sessionToken !== token) {
        throw new UnauthorizedException(
          'Session expired. You are logged in on another device.',
        );
      }

      const fullUser = await this.userService.findOne(id);
      (req as any).userType = type;

      return fullUser;
    }

    if (type === LoginType.customer) {
      const customer = await this.customerService.findOneForLogin(id);
      if (!customer)
        throw new UnauthorizedException('Token inválido (customer)');
      if (customer.sessionToken !== token) {
        throw new UnauthorizedException(
          'Session expired. You are logged in on another device.',
        );
      }

      const fullCustomer = await this.customerService.findOne(id);
      (req as any).userType = type;

      return fullCustomer;
    }

    throw new UnauthorizedException('Unrecognized type');
  }
}
