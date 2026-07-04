import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryRunner, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { SeatStatus } from 'src/common/enums';
import { TravelStatus } from 'src/modules/travels/enums';
import { PaymentType, TicketStatus, TicketType } from '../enums';

import {
  AssignBillingDto,
  CreateTicketInAppDto,
  AssignPassengersBatchInAppDto,
} from '../dto';

import { TicketsService } from '../tickets.service';
import { BillingsService } from '../billings.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { TicketExpirationService } from '../ticket-expiration.service';
import { PenaltiesService } from 'src/modules/customers/penalties.service';

import { Ticket } from '../entities/ticket.entity';
import { Travel } from '../../travels/entities/travel.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Injectable()
export class TicketsInAppService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    private readonly ticketExpirationService: TicketExpirationService,

    private readonly ticketsService: TicketsService,

    private readonly walletService: WalletService,

    private readonly billingsService: BillingsService,

    private readonly penaltiesService: PenaltiesService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                         Create                                                 */
  //? ============================================================================================== */

  async create(dto: CreateTicketInAppDto, buyer: Customer) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const travel = await this.findActiveTravel(
        dto.travelId,
        queryRunner.manager,
      );

      const ticket = await this.ticketsService.createTicketBase({
        dto,
        buyer,
        type: TicketType.IN_APP,
        paymentType: PaymentType.QR,
        travel,
        manager: queryRunner.manager,
      });

      //! Penalty
      await this.registerPenalty(buyer, queryRunner.manager);

      await queryRunner.commitTransaction();
      return ticket;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */

  private async findActiveTravel(
    travelId: number,
    manager: EntityManager,
  ): Promise<Travel> {
    const travel = await manager.findOne(Travel, {
      where: { id: travelId },
      relations: { bus: true, company: true },
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
    if (new Date() >= new Date(travel.departure_time)) {
      throw new BadRequestException(
        `This travel is no longer available for app operations`,
      );
    }
    return travel;
  }

  //? ============================================================================================== */

  private async registerPenalty(
    buyer: Customer,
    manager: EntityManager,
  ): Promise<void> {
    await this.penaltiesService.registerFailure(buyer, manager);
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findAll(customer: Customer) {
    return await this.dataSource.transaction(async (manager) => {
      const travelsToExpire = await manager.find(Travel, {
        select: { id: true },
        where: { tickets: { buyer: customer } },
      });

      for (const travel of travelsToExpire) {
        await this.ticketExpirationService.expireTravelIfNeeded(
          travel.id,
          manager,
        );
      }

      const tickets = await manager.find(Ticket, {
        where: {
          buyer: { id: customer.id },
        },
        relations: {
          travel: {
            bus: { busType: true, company: true },
            route: { officeOrigin: true, officeDestination: true },
            company: true,
          },
        },
      });

      const now = new Date();

      return tickets.map((ticket) => {
        const { departure_time, company, travel_status } = ticket.travel;
        const cutoff = new Date(
          departure_time.getTime() -
            company.hours_before_closing * 60 * 60 * 1000,
        );
        return {
          ...ticket,
          past: departure_time < now,
          cancelable: cutoff,
          closed: travel_status === TravelStatus.CLOSED,
        };
      });
    });
  }

  //? ============================================================================================== */
  //?                                       FindOne                                                  */
  //? ============================================================================================== */

  async findOne(ticketId: number, customer: Customer) {
    return await this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(Ticket, {
        where: { id: ticketId, buyer: { id: customer.id } },
        relations: { travel: { company: true } },
      });

      if (!ticket) throw new NotFoundException('Ticket not Found');

      await this.ticketExpirationService.expireTravelIfNeeded(
        ticket.travel.id,
        manager,
      );

      const updatedTicket = await manager.findOne(Ticket, {
        where: { id: ticketId },
        relations: {
          travel: {
            bus: { company: true, busType: true },
            route: { officeDestination: true, officeOrigin: true },
            company: true,
          },
          travelSeats: true,
        },
      });

      if (!updatedTicket) throw new NotFoundException('Ticket not Found');

      const now = new Date();
      const { departure_time, company, travel_status } = updatedTicket.travel;
      const cutoff = new Date(
        departure_time.getTime() -
          company.hours_before_closing * 60 * 60 * 1000,
      );

      return {
        ...updatedTicket,
        past: departure_time < now,
        cancelable: cutoff,
        closed: travel_status === TravelStatus.CLOSED,
      };
    });
  }

  //? ============================================================================================== */
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  async cancel(ticketId: number, customer: Customer) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ticket = await this.findCancelableTicket(
        ticketId,
        customer,
        queryRunner,
      );

      if (ticket.travel.travel_status !== TravelStatus.ACTIVE) {
        throw new BadRequestException(
          `Travel ${ticket.travel.id} is not active`,
        );
      }
      if (ticket.travel.enabled === false) {
        throw new BadRequestException(
          `Travel ${ticket.travel.id} is not enabled`,
        );
      }

      this.assertWithinOperatingWindow(ticket.travel);

      //! wallet
      if (ticket.status == TicketStatus.SOLD && ticket.buyer) {
        await this.walletService.creditFromTicketCancel(
          ticket,
          ticket.buyer,
          true,
          queryRunner.manager,
        );
      }
      //! wallet

      this.changeTicketState(ticket, TicketStatus.CANCELLED);

      await queryRunner.manager.save(Ticket, ticket);

      await queryRunner.commitTransaction();

      return {
        message: 'Ticket canceled successfully',
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
  //?                        Get_Active_Reservation                                                  */
  //? ============================================================================================== */

  async getActiveReservation(customer: Customer) {
    const ticket = await this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.paymentQr', 'paymentQr')
      .where('ticket.buyerId = :buyerId', {
        buyerId: customer.id,
      })
      .andWhere('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.RESERVED, TicketStatus.PENDING_PAYMENT],
      })
      .andWhere('ticket.type = :type', { type: TicketType.IN_APP })
      .andWhere(
        '(ticket.reserve_expiresAt IS NULL OR ticket.reserve_expiresAt > NOW())',
      )
      .getOne();

    return ticket ?? null;
  }

  //? ============================================================================================== */
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignBilling(ticketId: number, dto: AssignBillingDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      const ticket = await manager.findOne(Ticket, {
        where: { id: ticketId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // Solo tickets creados desde la APP
      if (ticket.type !== TicketType.IN_APP) {
        throw new BadRequestException(
          'Only app tickets can assign billing later',
        );
      }

      if (ticket.status !== TicketStatus.RESERVED) {
        throw new BadRequestException(
          'Cannot assign billing to a processed ticket',
        );
      }

      const billing = await this.billingsService.createOrUpdateBilling(
        dto.billing,
        manager,
      );

      //  Asignar billing al ticket
      ticket.billing = billing;

      await manager.save(ticket);
      await queryRunner.commitTransaction();

      return {
        message: 'Billing assigned successfully',
        ticket: ticket,
        billing: billing,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignPassenger(
    dto: AssignPassengersBatchInAppDto,
    customer: Customer,
  ) {
    return this.ticketsService.assignPassengerBase({
      customer,
      passengers: dto.passengers,
      ticketId: dto.ticketId,
    });
  }

  //? ============================================================================================== */
  //?                                      Functions                                                 */
  //? ============================================================================================== */

  private async findCancelableTicket(
    ticketId: number,
    customer: Customer,
    queryRunner: QueryRunner,
  ): Promise<Ticket> {
    const ticket = await queryRunner.manager
      .createQueryBuilder(Ticket, 'ticket')
      .setLock('pessimistic_write')
      .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
      .innerJoinAndSelect('ticket.travel', 'travel')
      .innerJoinAndSelect('travel.company', 'company')
      .innerJoinAndSelect('ticket.buyer', 'buyer')
      .where('ticket.id = :ticketId', { ticketId })
      .andWhere('ticket.buyerId = :buyerId', {
        buyerId: customer.id,
      })
      .andWhere('ticket.status IN (:...statuses)', {
        statuses: [
          TicketStatus.SOLD,
          TicketStatus.RESERVED,
          TicketStatus.PENDING_PAYMENT,
        ],
      })
      .andWhere('ticket.type = :type', {
        type: TicketType.IN_APP,
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
    const previousStatus = ticket.status;
    ticket.status = newStatus;

    switch (newStatus) {
      case TicketStatus.CANCELLED:
        this.applyCancelledState(ticket, previousStatus);
        break;
    }
  }

  //? ============================================================================================== */

  private applyCancelledState(
    ticket: Ticket,
    previousStatus: TicketStatus,
  ): void {
    ticket.reserve_expiresAt = null;
    ticket.cancelledAt = new Date();

    if (
      previousStatus === TicketStatus.RESERVED ||
      previousStatus === TicketStatus.PENDING_PAYMENT
    ) {
      ticket.deletedAt = new Date();
    }

    for (const seat of ticket.travelSeats) {
      seat.status = SeatStatus.AVAILABLE;
      seat.ticket = null;
      seat.price = '0';
      seat.passenger = null;
    }
  }

  //? ============================================================================================== */

  private assertWithinOperatingWindow(travel: Travel): void {
    const cutoff = new Date(
      travel.departure_time.getTime() -
        travel.company.hours_before_closing * 60 * 60 * 1000,
    );
    if (new Date() >= cutoff) {
      throw new BadRequestException(
        `This travel is no longer available for app operations ${travel.company.hours_before_closing}h before departure`,
      );
    }
  }
}
