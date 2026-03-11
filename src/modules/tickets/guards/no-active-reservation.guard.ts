import {
  CanActivate,
  Injectable,
  ExecutionContext,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';

import { TicketType } from '../enums/ticket-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class NoActiveReservationGuard implements CanActivate {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const customer = request.user;

    const existingReservation = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.buyerId = :buyerId', { buyerId: customer.id })
      .andWhere('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.RESERVED, TicketStatus.PENDING_PAYMENT],
      })
      .andWhere('ticket.type = :type', { type: TicketType.IN_APP })
      .andWhere(
        new Brackets((qb) => {
          qb.where('ticket.reserve_expiresAt IS NULL').orWhere(
            'ticket.reserve_expiresAt > NOW()',
          );
        }),
      )
      .getOne();

    if (existingReservation) {
      throw new ConflictException('You already have an active reservation');
    }

    return true;
  }
}
