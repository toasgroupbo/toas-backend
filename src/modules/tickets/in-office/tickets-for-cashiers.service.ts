import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { SeatStatus } from 'src/common/enums';
import { TravelStatus } from 'src/modules/travels/enums';
import { PaymentType, TicketStatus, TicketType } from '../enums';

import {
  CreateTicketInOfficeDto,
  AssignPassengersBatchInOfficeDto,
} from '../dto';
import { TicketForCashierFilterDto } from '../pagination/ticket-for-cashier-pagination.dto';

import { TicketsService } from '../tickets.service';
import { BillingsService } from '../billings.service';
import { TicketExpirationService } from '../ticket-expiration.service';

import { Ticket } from '../entities/ticket.entity';
import { User } from '../../users/entities/user.entity';
import { Travel } from '../../travels/entities/travel.entity';

@Injectable()
export class TicketsForCashierService {
  constructor(
    private readonly ticketExpirationService: TicketExpirationService,

    private readonly ticketsService: TicketsService,

    private readonly billingService: BillingsService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                          Create                                                */
  //? ============================================================================================== */

  async create(dto: CreateTicketInOfficeDto, cashier: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const travel = await this.findActiveTravel(
        dto.travelId,
        queryRunner.manager,
      );

      const billing = await this.billingService.createOrUpdateBilling(
        dto.billing,
        queryRunner.manager,
      );

      const ticket = await this.ticketsService.createTicketBase({
        dto,
        user: cashier,
        type: TicketType.IN_OFFICE,
        paymentType: dto.payment_type,
        travel,
        billing, //! se manda el billing
        manager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();
      return ticket;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /* async create(dto: CreateTicketInOfficeDto, cashier: User) {
    return this.ticketsService.createTicketBase({
      dto,
      user: cashier,
      type: TicketType.IN_OFFICE,
      paymentType: dto.payment_type,
    });
  } */

  //? ============================================================================================== */

  private async findActiveTravel(
    travelId: number,
    manager: EntityManager,
  ): Promise<Travel> {
    const travel = await manager.findOne(Travel, {
      where: { id: travelId },
      relations: { bus: true },
    });
    if (!travel) {
      throw new NotFoundException(`Travel with ID ${travelId} not found`);
    }
    if (travel.travel_status !== TravelStatus.ACTIVE) {
      throw new BadRequestException(`Travel ${travelId} is not active`);
    }
    if (travel.enabled === false) {
      throw new BadRequestException(`Travel ${travelId} is not enable`);
    }
    return travel;
  }

  //? ============================================================================================== */
  //?                                      Confirm                                                   */
  //? ============================================================================================== */

  async confirm(ticketId: number, cashier: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ticket = await this.findConfirmableTicket(
        ticketId,
        cashier,
        queryRunner,
      );

      this.changeTicketState(ticket, TicketStatus.SOLD);

      await queryRunner.manager.save(Ticket, ticket);
      await queryRunner.commitTransaction();

      return {
        message: 'Ticket payment confirmed successfully',
        ticket,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  async cancel(ticketId: number, cashier: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ticket = await this.findCancelableTicket(
        ticketId,
        cashier,
        queryRunner,
      );

      if (!this.isTicketCancelable(ticket)) {
        throw new BadRequestException(
          `Cannot cancel a ticket with status "${ticket.status}"`,
        );
      }

      this.changeTicketState(ticket, TicketStatus.CANCELLED, cashier);

      await queryRunner.manager.save(Ticket, ticket);
      await queryRunner.commitTransaction();

      return {
        message: 'Ticket canceled successfully',
        ticketId: ticket,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(
    travelId: number,
    //cashier: User,
    filters: TicketForCashierFilterDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(
        travelId,
        manager,
      );

      const { status } = filters;

      const where: any = {};

      //! status
      if (status) where.status = status;

      const tickets = await manager.find(Ticket, {
        order: { id: 'DESC' },
        where: {
          ...where,
          travel: { id: travelId },
          //soldBy: { id: cashier.id },
        },
        relations: {
          travel: { company: true, route: true },
          billing: true,
          travelSeats: true,
          buyer: true,
          canceledBy: true,
          soldBy: true,
        },
      });

      return tickets;
    });
  }

  //? ============================================================================================== */
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignPassenger(dto: AssignPassengersBatchInOfficeDto) {
    return this.ticketsService.assignPassengerBase({
      passengers: dto.passengers,
      ticketId: dto.ticketId,
    });
  }

  //? ============================================================================================== */
  //?                                      Functions                                                 */
  //? ============================================================================================== */

  private async findConfirmableTicket(
    ticketId: number,
    cashier: User,
    queryRunner: QueryRunner,
  ): Promise<Ticket> {
    const ticket = await queryRunner.manager
      .createQueryBuilder(Ticket, 'ticket')
      .setLock('pessimistic_write')

      .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
      .innerJoinAndSelect('ticket.travel', 'travel')
      .innerJoin('travel.bus', 'bus')

      .where('ticket.id = :ticketId', { ticketId })
      .andWhere('bus.companyId = :companyId', {
        companyId: cashier.office?.company.id,
      })
      .andWhere('ticket.status = :status', {
        status: TicketStatus.RESERVED,
      })
      .andWhere('ticket.type = :type', {
        type: TicketType.IN_OFFICE,
      })
      .andWhere('ticket.payment_type = :payment_type', {
        payment_type: PaymentType.CASH,
      })
      .andWhere('(ticket.reserve_expiresAt > NOW())')
      .getOne();

    if (!ticket) {
      throw new NotFoundException(
        'Ticket not found, expired, or not in a confirmable state',
      );
    }
    return ticket;
  }

  //? ============================================================================================== */

  private async findCancelableTicket(
    ticketId: number,
    cashier: User,
    queryRunner: QueryRunner,
  ): Promise<Ticket> {
    const ticket = await queryRunner.manager
      .createQueryBuilder(Ticket, 'ticket')
      .setLock('pessimistic_write')

      .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
      .innerJoinAndSelect('ticket.travel', 'travel')
      .innerJoin('travel.bus', 'bus')
      .innerJoin('bus.owner', 'owner')
      .innerJoin('owner.companies', 'company')

      .where('ticket.id = :ticketId', { ticketId })
      .andWhere('company.id = :companyId', {
        companyId: cashier.office?.company.id,
      })
      .andWhere('ticket.status IN (:...statuses)', {
        statuses: [
          TicketStatus.SOLD,
          TicketStatus.RESERVED,
          TicketStatus.PENDING_PAYMENT,
        ],
      })
      .andWhere('ticket.type = :type', {
        type: TicketType.IN_OFFICE,
      })
      .andWhere(
        '(ticket.reserve_expiresAt IS NULL OR ticket.reserve_expiresAt > NOW())',
      )
      .getOne();

    if (!ticket) {
      throw new NotFoundException('Ticket not found or expired');
    }

    return ticket;
  }

  //? ============================================================================================== */

  private changeTicketState(
    ticket: Ticket,
    newStatus: TicketStatus,
    cashier?: User,
  ): void {
    const currentStatus = ticket.status;

    ticket.status = newStatus;

    switch (newStatus) {
      case TicketStatus.SOLD:
        this.applySoldState(ticket);
        break;

      case TicketStatus.CANCELLED:
        this.applyCancelledState(ticket, currentStatus, cashier);
        break;
    }
  }

  //? ============================================================================================== */

  private applySoldState(ticket: Ticket): void {
    ticket.reserve_expiresAt = null;

    for (const seat of ticket.travelSeats) {
      seat.status = SeatStatus.SOLD;
    }
  }

  //? ============================================================================================== */

  private applyCancelledState(
    ticket: Ticket,
    previousStatus: TicketStatus,
    cashier?: User,
  ): void {
    ticket.reserve_expiresAt = null;
    ticket.cancelledAt = new Date();
    ticket.canceledBy = cashier || null;

    if (
      previousStatus === TicketStatus.RESERVED ||
      previousStatus === TicketStatus.PENDING_PAYMENT
    ) {
      ticket.deletedAt = new Date();
    }

    for (const seat of ticket.travelSeats) {
      seat.status = SeatStatus.AVAILABLE;
      seat.price = '0';
      seat.ticket = null;
      seat.passenger = null;
    }
  }

  //? ============================================================================================== */

  private isTicketCancelable(ticket: Ticket): boolean {
    return [
      TicketStatus.RESERVED,
      TicketStatus.SOLD,
      TicketStatus.PENDING_PAYMENT,
    ].includes(ticket.status);
  }

  //? ============================================================================================== */

  private hasTravelDeparted(travel: Travel): boolean {
    return travel.departure_time <= new Date();
  }
}
