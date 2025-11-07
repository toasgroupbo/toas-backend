import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { envs } from '../../config/environments/environments';

import { LoginType } from '../../common/enums/login-type.enum';
import { IJwtPayload } from '../interfaces/jwt-payload.interface';

import { CustomersService } from '../../modules/customers/customers.service';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UsersService,
    private readonly customerService: CustomersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: envs.JWT_SECRET,
    });
  }

  async validate(jwtPayload: IJwtPayload) {
    const { id, type } = jwtPayload;

    if (type === LoginType.user) {
      const user = await this.userService.findOne(id);
      if (!user) throw new UnauthorizedException('Token inválido (user)');
      return user; //! se introduce el user en la req
    }

    if (type === LoginType.customer) {
      const customer = await this.customerService.findOne(id);
      if (!customer)
        throw new UnauthorizedException('Token inválido (customer)');
      return customer; //! se introduce el customer en la req
    }

    throw new UnauthorizedException('Unrecognized type');
  }
}
