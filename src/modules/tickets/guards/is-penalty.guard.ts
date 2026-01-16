import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { PenaltiesService } from 'src/modules/customers/penalties.service';

@Injectable()
export class IsPenaltyGuard implements CanActivate {
  constructor(private readonly reservationPenaltyService: PenaltiesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const customer = request.user;

    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    await this.reservationPenaltyService.validateReservation(customer);

    return true;
  }
}
