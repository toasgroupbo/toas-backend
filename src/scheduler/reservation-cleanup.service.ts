import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

import { SeatStatus } from 'src/common/enums';
import { SaleType } from 'src/modules/travels/enums/sale_type-enum';
import { TicketStatus } from 'src/modules/tickets/enums/ticket-status.enum';
import { TravelStatus } from 'src/modules/travels/enums/travel-status.enum';

import { Ticket } from 'src/modules/tickets/entities/ticket.entity';

@Injectable()
export class ReservationCleanupService {
  constructor(private readonly dataSource: DataSource) {}

  @Cron('*/1 * * * *')
  async cleanExpiredReservations() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //! Buscar tickets expirados
      const expiredTickets = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .leftJoinAndSelect('ticket.travelSeats', 'seat')
        .leftJoin('ticket.travel', 'travel')
        .where('ticket.status IN (:...statuses)', {
          statuses: [TicketStatus.RESERVED, TicketStatus.PENDING_PAYMENT],
        })
        .andWhere('ticket.reserve_expiresAt < NOW()')
        .andWhere('travel.travel_status = :active', {
          active: TravelStatus.ACTIVE,
        })
        .getMany();

      for (const ticket of expiredTickets) {
        ticket.status = TicketStatus.EXPIRED;
        ticket.deletedAt = new Date();
        //ticket.reserve_expiresAt = null;

        for (const seat of ticket.travelSeats) {
          seat.status = SeatStatus.AVAILABLE;
          seat.sale_type = SaleType.UNSOLD;
          seat.price = '0';
          seat.ticket = null;
          seat.passenger = null;
        }
      }

      await queryRunner.manager.save(expiredTickets);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
