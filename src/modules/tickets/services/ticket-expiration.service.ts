import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, LessThan } from 'typeorm';

import { SeatStatus } from 'src/common/enums';
import { TicketType } from '../enums/ticket-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';
import { TravelStatus } from 'src/modules/travels/enums/travel-status.enum';

import { PenaltiesService } from 'src/modules/customers/penalties.service';

import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class TicketExpirationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly penaltyService: PenaltiesService,
  ) {}

  //? ============================================================================================== */
  //?                           ExpireTravelIfNeeded                                                 */
  //? ============================================================================================== */

  async expireTravelIfNeeded(
    travelId: number,
    manager?: EntityManager,
  ): Promise<number> {
    const internalManager = manager ?? this.dataSource.manager;

    const expiredTickets = await internalManager.find(Ticket, {
      where: {
        travel: { id: travelId },
        status: In([TicketStatus.RESERVED, TicketStatus.PENDING_PAYMENT]),
        reserve_expiresAt: LessThan(new Date()),
      },
      relations: { travelSeats: true, buyer: true },
    });

    let expiredCount = 0;

    for (const ticket of expiredTickets) {
      ticket.status = TicketStatus.EXPIRED;
      ticket.deletedAt = new Date();
      //ticket.reserve_expiresAt = null;

      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.AVAILABLE;
        seat.ticket = null;
        seat.price = '0';
        seat.passenger = null;
        await internalManager.save(seat);
      }

      if (ticket.type === TicketType.IN_APP && ticket.buyer) {
        await this.penaltyService.registerFailure(
          ticket.buyer,
          internalManager,
        );
      }

      await internalManager.save(ticket);
      expiredCount++;
    }

    return expiredCount;
  }

  //? ============================================================================================== */
  //?                                   Expire_Batch                                                 */
  //? ============================================================================================== */

  async expireBatch(limit: number = 100): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expiredTickets = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .leftJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .leftJoinAndSelect('ticket.buyer', 'buyer')
        .leftJoin('ticket.travel', 'travel')
        .where('ticket.status = :status', { status: TicketStatus.RESERVED })
        .andWhere('ticket.reserve_expiresAt < NOW()')
        .andWhere('travel.travel_status = :active', {
          active: TravelStatus.ACTIVE,
        })
        .take(limit)
        .getMany();

      let expiredCount = 0;

      for (const ticket of expiredTickets) {
        ticket.status = TicketStatus.EXPIRED;
        ticket.reserve_expiresAt = null;

        for (const seat of ticket.travelSeats) {
          seat.status = SeatStatus.AVAILABLE;
          seat.ticket = null;
          seat.price = '0';
          seat.passenger = null;
          await queryRunner.manager.save(seat);
        }

        if (ticket.type === TicketType.IN_APP && ticket.buyer) {
          await this.penaltyService.registerFailure(
            ticket.buyer,
            queryRunner.manager,
          );
        }

        await queryRunner.manager.save(ticket);
        expiredCount++;
      }

      await queryRunner.commitTransaction();
      return expiredCount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
