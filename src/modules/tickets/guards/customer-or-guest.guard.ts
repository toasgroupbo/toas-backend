import { Injectable, ExecutionContext } from '@nestjs/common';

import { LoginType } from 'src/common/enums';

import { IsVerifyGuard } from './is-verify.guard';

//! para endpoints de solo lectura de la app (rutas, viajes): deja pasar al invitado
//! y, si es un customer, exige lo mismo que IsVerifyGuard
@Injectable()
export class CustomerOrGuestGuard extends IsVerifyGuard {
  canActivate(cxt: ExecutionContext): boolean {
    const req = cxt.switchToHttp().getRequest<{ userType?: LoginType }>();

    if (req.userType === LoginType.guest) return true;

    return super.canActivate(cxt);
  }
}
