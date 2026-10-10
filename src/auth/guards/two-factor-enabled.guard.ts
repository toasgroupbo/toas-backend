import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { TwoFactorRequiredException } from '../exceptions/two-factor-required.exception';

import { User } from '../../modules/users/entities/user.entity';

//! exige que el user logueado (quien hace la acción) tenga el 2FA activo.
//! va después de @Auth(...): necesita req.user ya cargado por JwtAuthGuard
@Injectable()
export class TwoFactorEnabledGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: User = context.switchToHttp().getRequest().user;

    if (!user?.isTwoFactorEnabled) {
      throw new TwoFactorRequiredException();
    }

    return true;
  }
}
