import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import { LoginType } from 'src/common/enums';
import { GuestNotAllowedException } from 'src/auth/exceptions/guest-not-allowed.exception';

import { Customer } from 'src/modules/customers/entities/customer.entity';

@Injectable()
export class IsVerifyGuard implements CanActivate {
  canActivate(cxt: ExecutionContext): boolean {
    const req = cxt
      .switchToHttp()
      .getRequest<{ user?: Customer; userType?: LoginType }>();
    const customer = req.user;

    //! el invitado solo entra a endpoints con CustomerOrGuestGuard
    if (req.userType === LoginType.guest) {
      throw new GuestNotAllowedException();
    }

    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    if (!customer.is_verified) {
      throw new ForbiddenException('Customer is not verified');
    }

    return true;
  }
}
