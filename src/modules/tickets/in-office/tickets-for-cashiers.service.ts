import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { SeatStatus } from 'src/common/enums';
import { PaymentType, TicketStatus, TicketType } from '../enums';

import {
  CreateTicketInOfficeDto,
  AssignPassengersBatchInOfficeDto,
} from '../dto';

import { TicketsService } from '../tickets.service';
import { TicketExpirationService } from '../ticket-expiration.service';

import { Ticket } from '../entities/ticket.entity';
import { User } from '../../users/entities/user.entity';
import { Travel } from '../../travels/entities/travel.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Injectable()
export class TicketsForCashierService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    private readonly ticketsService: TicketsService,
    private readonly ticketExpirationService: TicketExpirationService,
    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                          Create                                                */
  //? ============================================================================================== */

  async create(dto: CreateTicketInOfficeDto, user: User) {
    return this.ticketsService.createTicketBase({
      dto,
      user,
      type: TicketType.IN_OFFICE,
      paymentType: dto.payment_type,
    });
  }

  //? ============================================================================================== */
  //?                                      Confirm                                                   */
  //? ============================================================================================== */

  async confirm(ticketId: number, cashier: User) {
    const queryRunner = this.createTransaction();

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
    const queryRunner = this.createTransaction();

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

      this.changeTicketState(ticket, TicketStatus.CANCELLED);

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

  async findAll(travelId: number, cashier: User) {
    await this.ticketExpirationService.expireTravelIfNeeded(travelId);

    const tickets = await this.ticketRepository.find({
      order: { id: 'DESC' },
      where: {
        travel: { id: travelId },
        soldBy: { id: cashier.id },
      },
      relations: { travelSeats: true, buyer: true },
    });
    return tickets;
  }

  //? ============================================================================================== */
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignPassenger(dto: AssignPassengersBatchInOfficeDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return this.ticketsService.assignPassengerBase({
      customer: customer,
      passengers: dto.passengers,
      ticketId: dto.ticketId,
    });
  }

  //? ============================================================================================== */
  //?                                      Functions                                                 */
  //? ============================================================================================== */

  private createTransaction(): QueryRunner {
    const queryRunner = this.dataSource.createQueryRunner();
    queryRunner.connect();
    queryRunner.startTransaction();
    return queryRunner;
  }

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

  private changeTicketState(ticket: Ticket, newStatus: TicketStatus): void {
    const currentStatus = ticket.status;

    ticket.status = newStatus;

    switch (newStatus) {
      case TicketStatus.SOLD:
        this.applySoldState(ticket);
        break;

      case TicketStatus.CANCELLED:
        this.applyCancelledState(ticket, currentStatus);
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
  ): void {
    ticket.reserve_expiresAt = null;

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
