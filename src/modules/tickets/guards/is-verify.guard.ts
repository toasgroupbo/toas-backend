import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Customer } from 'src/modules/customers/entities/customer.entity';

@Injectable()
export class IsVerifyGuard implements CanActivate {
  canActivate(cxt: ExecutionContext): boolean {
    const req = cxt.switchToHttp().getRequest();
    const customer: Customer = req.user;

    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    if (!customer.is_verified) {
      throw new ForbiddenException('Customer is not verified');
    }

    return true;
  }
}
