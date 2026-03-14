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

import { CreateTicketInAppDto, AssignPassengersBatchInAppDto } from '../dto';

import { TicketsService } from '../tickets.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { TicketExpirationService } from '../ticket-expiration.service';

import { Ticket } from '../entities/ticket.entity';
import { Travel } from '../../travels/entities/travel.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Injectable()
export class TicketsInAppService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    private readonly ticketExpirationService: TicketExpirationService,
    private readonly ticketsService: TicketsService,

    private readonly walletService: WalletService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                         Create                                                 */
  //? ============================================================================================== */

  async create(dto: CreateTicketInAppDto, buyer: Customer) {
    return this.ticketsService.createTicketBase({
      dto,
      buyer,
      type: TicketType.IN_APP,
      paymentType: dto.payment_type,
    });
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findAll(customer: Customer) {
    const travelsToExpire = await this.travelRepository.find({
      /* select: { id: true },
      where: { tickets: { buyer: customer } }, */
      //! revisar
    });

    for (const travel of travelsToExpire) {
      await this.ticketExpirationService.expireTravelIfNeeded(travel.id);
    }

    return await this.ticketRepository.find({
      where: {
        buyer: { id: customer.id },
      },
    });
  }

  //? ============================================================================================== */
  //?                           Confirm_With_Wallet                                                  */
  //? ============================================================================================== */

  async confirmWalletPayment(ticketId: number, customer: Customer) {
    const queryRunner = this.createTransaction();
    try {
      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .where('ticket.id = :ticketId', { ticketId })
        .andWhere('ticket.buyerId = :buyerId', { buyerId: customer.id })
        .andWhere('ticket.type = :type', { type: TicketType.IN_APP })
        .andWhere('ticket.payment_type = :paymentType', {
          paymentType: PaymentType.WALLET,
        })
        .andWhere('ticket.status = :status', {
          status: TicketStatus.RESERVED,
        })
        .andWhere('ticket.reserve_expiresAt > NOW()')
        .getOne();

      if (!ticket) {
        throw new NotFoundException(
          'Ticket not found or not available for wallet payment',
        );
      }

      // 2. VALIDAR SALDO SUFICIENTE
      const totalPrice = Number(ticket.total_price) + Number(ticket.commission); //! ticket + comision
      /*  const availableBalance = await this.walletService.getAvailableBalance(
        customer,
        queryRunner.manager,
      );

      if (availableBalance < totalPrice) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available: ${availableBalance.toFixed(2)}, Required: ${totalPrice.toFixed(2)}`,
        );
      } */

      // 3. CONSUMIR WALLET (FIFO)
      const consumed = await this.walletService.consumeForTicket({
        customer,
        ticket,
        amount: totalPrice,
        manager: queryRunner.manager,
      });

      if (consumed < totalPrice) {
        throw new BadRequestException('Failed to consume wallet balance');
      }

      // 4. ACTUALIZAR TICKET A SOLD
      await queryRunner.manager.update(Ticket, ticket.id, {
        status: TicketStatus.SOLD,
        reserve_expiresAt: null,
      });

      // 5. ACTUALIZAR ASIENTOS A SOLD
      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.SOLD;
        await queryRunner.manager.save(seat);
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Ticket paid successfully with wallet',
        ticket: {
          id: ticket.id,
          total_price: ticket.total_price,
          status: TicketStatus.SOLD,
        },
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

  async cancel(ticketId: number, customer: Customer) {
    const queryRunner = this.createTransaction();

    try {
      const ticket = await this.findCancelableTicket(
        ticketId,
        customer,
        queryRunner,
      );

      if (!this.isTicketCancelable(ticket)) {
        throw new BadRequestException(
          `Cannot cancel a ticket with status "${ticket.status}"`,
        );
      }

      //! wallet
      if (ticket.payment_type === PaymentType.WALLET) {
        await this.walletService.creditFromTicketCancelWallet(
          ticket,
          ticket.buyer,
          queryRunner.manager,
        );
      }

      if (ticket.payment_type === PaymentType.QR) {
        await this.walletService.creditFromTicketCancelQR(
          ticket,
          ticket.buyer,
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

  private createTransaction(): QueryRunner {
    const queryRunner = this.dataSource.createQueryRunner();
    queryRunner.connect();
    queryRunner.startTransaction();
    return queryRunner;
  }

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

  private isTicketCancelable(ticket: Ticket): boolean {
    return [
      TicketStatus.SOLD,
      TicketStatus.RESERVED,
      TicketStatus.PENDING_PAYMENT,
    ].includes(ticket.status);
  }

  //? ============================================================================================== */

  private hasTravelDeparted(travel: Travel): boolean {
    return travel.departure_time <= new Date();
  }
}
