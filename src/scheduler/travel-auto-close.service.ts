import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';

import { SeatStatus } from 'src/common/enums';
import { SaleType } from 'src/modules/travels/enums/sale_type-enum';
import { TicketStatus } from 'src/modules/tickets/enums/ticket-status.enum';
import { TravelStatus } from 'src/modules/travels/enums/travel-status.enum';

import { User } from 'src/modules/users/entities/user.entity';
import { Travel } from 'src/modules/travels/entities/travel.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { TravelSeat } from 'src/modules/travels/entities/travel-seat.entity';

@Injectable()
export class TravelAutoCloseService {
  constructor(private readonly dataSource: DataSource) {}

  @Cron('*/1 * * * *')
  async autoCloseTravels() {
    const toleranceMinutes = 10;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const travels = await queryRunner.manager
        .createQueryBuilder(Travel, 'travel')
        .setLock('pessimistic_write')
        .where('travel.status = :status', {
          status: TravelStatus.ACTIVE,
        })
        .andWhere(
          `travel.departure_time <= NOW() - INTERVAL '${toleranceMinutes} minutes'`,
        )
        .getMany();

      for (const travel of travels) {
        await this.closeTravelInternal(
          travel,
          queryRunner.manager,
          undefined,
          true,
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //! Lógica compartida
  private async closeTravelInternal(
    travel: Travel,
    manager: EntityManager,
    closedBy?: User,
    isAutomatic = false,
  ) {
    travel.travel_status = TravelStatus.CLOSED;
    travel.closedAt = new Date();
    travel.closedBy = closedBy ?? null;
    travel.closedAutomatically = isAutomatic;

    const now = new Date();

    const tickets = await manager.find(Ticket, {
      where: { travel: { id: travel.id } },
      relations: { travelSeats: true },
    });

    for (const ticket of tickets) {
      if (ticket.status === TicketStatus.RESERVED) {
        if (ticket.reserve_expiresAt && ticket.reserve_expiresAt < now) {
          ticket.status = TicketStatus.EXPIRED;
        } else {
          ticket.status = TicketStatus.CANCELLED_FOR_CLOSE;
        }
        ticket.reserve_expiresAt = null;
      }
    }

    const seats = await manager.find(TravelSeat, {
      where: { travel: { id: travel.id } },
    });

    for (const seat of seats) {
      if (seat.status !== SeatStatus.SOLD) {
        seat.status = SeatStatus.UNSOLD;
        seat.sale_type = SaleType.UNSOLD;
        seat.price = '0';
        seat.ticket = null;
        seat.reserve_expiresAt = null;
      }
    }

    await manager.save(travel);
    await manager.save(tickets);
    await manager.save(seats);
  }
}
