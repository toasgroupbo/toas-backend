import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { SeatStatus } from 'src/common/enums';
import { TicketStatus } from '../enums/ticket-status.enum';

import { PenaltiesService } from 'src/modules/customers/penalties.service';

import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class TicketExpirationService {
  constructor(
    private readonly dataSource: DataSource,

    private readonly penaltyService: PenaltiesService,
  ) {}

  async expireIfNeeded(ticketId: number, reason: 'EXPIRED' | 'CANCELLED') {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const ticket = await queryRunner.manager.findOne(Ticket, {
        where: { id: ticketId },
        lock: { mode: 'pessimistic_write' },
        relations: { travelSeats: true },
      });

      if (!ticket) {
        await queryRunner.commitTransaction();
        return;
      }

      //! Idempotencia
      if (
        ticket.status === TicketStatus.EXPIRED ||
        ticket.status === TicketStatus.CANCELLED
      ) {
        await queryRunner.commitTransaction();
        return;
      }

      //! Validación temporal
      if (
        reason === 'EXPIRED' &&
        ticket.reserve_expiresAt &&
        ticket.reserve_expiresAt > new Date()
      ) {
        await queryRunner.commitTransaction();
        return;
      }

      // 1 Expirar ticket
      ticket.status =
        reason === 'CANCELLED' ? TicketStatus.CANCELLED : TicketStatus.EXPIRED;

      ticket.reserve_expiresAt = null;

      await queryRunner.manager.save(ticket);

      // 2 Liberar asientos
      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.AVAILABLE;
        seat.ticket = null;
        await queryRunner.manager.save(seat);
      }

      // 3 Penalizar
      await this.penaltyService.registerFailure(
        ticket.buyer,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
