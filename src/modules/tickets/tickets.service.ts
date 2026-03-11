import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Not,
  QueryRunner,
  Repository,
} from 'typeorm';

import { envs } from 'src/config/environments/environments';
import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { SeatStatus } from 'src/common/enums';
import { PaymentType, TicketStatus, TicketType } from './enums';
import { TravelStatus } from '../travels/enums/travel-status.enum';

import {
  SelectedSeatsDto,
  CreateTicketInAppDto,
  CreateTicketInOfficeDto,
} from './dto';

import { PassengerSeatBatchDto } from './dto/assign-passengers-batch-in-app.dto';

import { PenaltiesService } from '../customers/penalties.service';
import { CustomersService } from '../customers/customers.service';
import { PassengersService } from '../customers/passengers.service';
import { TicketExpirationService } from './ticket-expiration.service';

import { Ticket } from './entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Setting } from '../settings/entities/setting.entity';
import { Penalty } from '../customers/entities/penalty.entity';
import { Customer } from '../customers/entities/customer.entity';
import { TravelSeat } from '../travels/entities/travel-seat.entity';
import { PaymentStatusEnum } from '../payments/entities/payment-qr.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    private readonly customersService: CustomersService,
    private readonly penaltiesService: PenaltiesService,
    private readonly ticketExpirationService: TicketExpirationService,
    private readonly passengersService: PassengersService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                          Create                                                */
  //? ============================================================================================== */

  async createTicketBase({
    dto,
    buyer,
    user,
    type,
    paymentType,
  }: {
    dto: CreateTicketInAppDto | CreateTicketInOfficeDto;
    buyer?: Customer;
    user?: User;
    type: TicketType;
    paymentType: PaymentType;
  }) {
    const queryRunner = this.createTransaction();

    try {
      await this.ticketExpirationService.expireTravelIfNeeded(
        dto.travelId,
        queryRunner.manager,
      );

      const travel = await this.findActiveTravel(
        dto.travelId,
        queryRunner.manager,
      );

      const seats = await this.getAndValidateAvailableSeats(
        dto.travelId,
        dto.seatSelections,
        queryRunner.manager,
      );

      const resolvedBuyer = await this.getBuyer(
        type,
        dto,
        buyer,
        queryRunner.manager,
      );

      const { seatsWithPrices, totalPrice } =
        await this.calculateAndUpdateSeatPrices(
          seats,
          dto.seatSelections,
          travel,
          queryRunner.manager,
        );

      const commission = await this.calculateCommission(
        type,
        queryRunner.manager,
      );

      const ticket = await this.createTicket(queryRunner.manager, {
        type,
        travel,
        buyer: resolvedBuyer,
        seats: this.prepareSeatsArray(seatsWithPrices),
        soldBy: type === TicketType.IN_OFFICE ? user : null,
        travelSeats: seatsWithPrices,
        reserve_expiresAt: this.getReservationExpiry(),
        payment_type: paymentType,
        commission: commission.toString(),

        total_price: totalPrice.toFixed(2),
        wallet_used: '0',
        qr_amount: '0',
      });

      await this.registerPenaltyIfNeeded(
        resolvedBuyer,
        user,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      return ticket;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
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
      relations: { bus: true },
    });

    if (!travel) {
      throw new NotFoundException(`Travel with ID ${travelId} not found`);
    }

    if (travel.travel_status !== TravelStatus.ACTIVE) {
      throw new BadRequestException(`Travel ${travelId} is not active`);
    }

    return travel;
  }

  //? ============================================================================================== */

  private async getAndValidateAvailableSeats(
    travelId: number,
    seatSelections: { seatId: string }[],
    manager: EntityManager,
  ): Promise<TravelSeat[]> {
    const seatIds = seatSelections.map((s) => s.seatId);

    const seats = await manager
      .createQueryBuilder(TravelSeat, 'seat')
      .setLock('pessimistic_write')
      .where('seat.id IN (:...seatIds)', { seatIds })
      .andWhere('seat.travelId = :travelId', { travelId })
      .andWhere('seat.deletedAt IS NULL')
      .andWhere('seat.status = :available', {
        available: SeatStatus.AVAILABLE,
      })
      .getMany();

    const validSeats = this.filterEmptySeats(seats);

    if (validSeats.length !== seatIds.length) {
      const foundIds = validSeats.map((s) => s.id.toString());
      const missingSeats = seatIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Some seats are unavailable or already sold: ${missingSeats.join(', ')}`,
      );
    }

    return seats;
  }

  //? ============================================================================================== */

  private filterEmptySeats(seats: TravelSeat[]): TravelSeat[] {
    return seats.filter((seat) => seat.seatNumber !== '0');
  }

  //? ============================================================================================== */

  private async getBuyer(
    type: TicketType,
    dto: CreateTicketInAppDto | CreateTicketInOfficeDto,
    buyer: Customer | undefined,
    manager: EntityManager,
  ): Promise<Customer | undefined> {
    if (type === TicketType.IN_OFFICE && !buyer) {
      const officeDto = dto as CreateTicketInOfficeDto;
      return this.customersService.findOne(officeDto.customerId, manager);
    }
    return buyer;
  }

  //? ============================================================================================== */

  private async calculateAndUpdateSeatPrices(
    seats: TravelSeat[],
    seatSelections: { seatId: string; price?: string }[],
    travel: Travel,
    manager: EntityManager,
  ): Promise<{ seatsWithPrices: TravelSeat[]; totalPrice: number }> {
    let totalPrice = 0;

    for (const seat of seats) {
      const selection = seatSelections.find(
        (s) => s.seatId.toString() === seat.id.toString(),
      );

      const finalPrice = this.resolveSeatPrice(selection, seat, travel);
      seat.price = finalPrice.toFixed(2);
      seat.status = SeatStatus.RESERVED;
      totalPrice += finalPrice;
    }

    await manager.save(seats);

    return { seatsWithPrices: seats, totalPrice };
  }

  //? ============================================================================================== */

  private prepareSeatsArray(seats: TravelSeat[]): SelectedSeatsDto[] {
    return seats.map((seat) => ({
      id: seat.id,
      seatNumber: seat.seatNumber,
      price: seat.price,
    }));
  }

  //? ============================================================================================== */

  private async calculateCommission(
    type: TicketType,
    manager: EntityManager,
  ): Promise<number> {
    if (type === TicketType.IN_APP) {
      const settings = await manager.find(Setting);
      return settings[0]?.commission || 0;
    }
    return 0;
  }

  //? ============================================================================================== */

  private async createTicket(
    manager: EntityManager,
    ticketData: Partial<Ticket>,
  ): Promise<Ticket> {
    const ticket = manager.create(Ticket, ticketData);
    return manager.save(ticket);
  }

  //? ============================================================================================== */

  private async registerPenaltyIfNeeded(
    buyer: Customer | undefined,
    user: User | undefined,
    manager: EntityManager,
  ): Promise<void> {
    if (buyer && !user) {
      await this.penaltiesService.registerFailure(buyer, manager);
    }
  }

  //? ============================================================================================== */

  private getReservationExpiry(): Date {
    const minutes = envs.RESERVATION_EXPIRE_MINUTES || 10;
    const now = new Date();
    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  //? ============================================================================================== */

  private resolveSeatPrice(
    selection: { seatId: string; price?: string } | undefined,
    seat: TravelSeat,
    travel: Travel,
  ): number {
    if (selection?.price && !isNaN(Number(selection.price))) {
      return Number(selection.price);
    }

    if (!travel.price_deck_2) {
      return Number(travel.price_deck_1);
    }

    return seat.deck === 2
      ? Number(travel.price_deck_2 || travel.price_deck_1)
      : Number(travel.price_deck_1);
  }
  //? ============================================================================================== */
  //?                              Confirm_Ticket_QR                                                 */
  //? ============================================================================================== */

  async confirmWithManager(ticketId: number, manager: EntityManager) {
    const ticket = await this.findQrTicketForConfirmation(ticketId, manager);

    this.applySoldState(ticket);
    await this.reducePenaltyForInAppTicket(ticket, manager);

    await manager.save(Ticket, ticket);

    return ticket;
  }

  //? ============================================================================================== */

  private async findQrTicketForConfirmation(
    ticketId: number,
    manager: EntityManager,
  ): Promise<Ticket> {
    const ticket = await manager
      .createQueryBuilder(Ticket, 'ticket')
      .setLock('pessimistic_write')
      .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
      .innerJoinAndSelect('ticket.paymentQr', 'paymentQr')
      .innerJoinAndSelect('ticket.buyer', 'buyer')
      .where('ticket.id = :ticketId', { ticketId })
      .andWhere('ticket.status = :status', {
        status: TicketStatus.PENDING_PAYMENT,
      })
      .andWhere('ticket.payment_type = :payment_type', {
        payment_type: PaymentType.QR,
      })
      .andWhere('ticket.reserve_expiresAt > NOW()')
      .getOne();

    if (!ticket) {
      throw new NotFoundException(
        'Ticket not found, expired, or not in a confirmable state',
      );
    }

    return ticket;
  }

  //? ============================================================================================== */

  private applySoldState(ticket: Ticket): void {
    ticket.status = TicketStatus.SOLD;
    ticket.reserve_expiresAt = null;

    if (ticket.paymentQr) {
      ticket.paymentQr.status = PaymentStatusEnum.PAID;
    }

    for (const seat of ticket.travelSeats) {
      seat.status = SeatStatus.SOLD;
    }
  }

  //? ============================================================================================== */

  private async reducePenaltyForInAppTicket(
    ticket: Ticket,
    manager: EntityManager,
  ): Promise<void> {
    if (ticket.type === TicketType.IN_APP && ticket.buyer) {
      const penaltyRepository = manager.getRepository(Penalty);

      const penalty = await penaltyRepository.findOne({
        where: { customer: { id: ticket.buyer.id } },
      });

      if (penalty && penalty.failedCount > 0) {
        penalty.failedCount -= 1;
        await penaltyRepository.save(penalty);
      }
    }
  }

  /* async confirmWithManager(ticketId: number, manager: EntityManager) {
    // --------------------------------------------
    // 2. Buscar ticket con lock y validaciones
    // --------------------------------------------

    const ticket = await manager
      .createQueryBuilder(Ticket, 'ticket')
      .setLock('pessimistic_write')
      .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
      .innerJoinAndSelect('ticket.paymentQr', 'paymentQr')
      .innerJoinAndSelect('ticket.buyer', 'buyer') // ← necesario
      .where('ticket.id = :ticketId', { ticketId })
      .andWhere('ticket.status = :status', {
        status: TicketStatus.PENDING_PAYMENT,
      })
      .andWhere('ticket.payment_type = :payment_type', {
        payment_type: PaymentType.QR,
      })
      .andWhere('(ticket.reserve_expiresAt > NOW())')
      .getOne();

    if (!ticket)
      throw new NotFoundException(
        'Ticket not found, expired, or not in a confirmable state',
      );

    // --------------------------------------------
    // 3. Actualizar estados
    // --------------------------------------------

    ticket.status = TicketStatus.SOLD;
    ticket.reserve_expiresAt = null;

    if (ticket.paymentQr) {
      ticket.paymentQr.status = PaymentStatusEnum.PAID;
    }

    for (const seat of ticket.travelSeats) {
      seat.status = SeatStatus.SOLD;
    }

    // --------------------------------------------
    // 4. Quitar penalización SOLO si es IN_APP
    // --------------------------------------------

    if (
      ticket.type === TicketType.IN_APP &&
      ticket.buyer 
    ) {
      const penaltyRepository = manager.getRepository(Penalty);

      const penalty = await penaltyRepository.findOne({
        where: { customer: { id: ticket.buyer.id } },
      });

      if (penalty && penalty.failedCount > 0) {
        penalty.failedCount -= 1;

        await penaltyRepository.save(penalty);
      }
    }

    // --------------------------------------------
    // 5. Persistir cambios
    // --------------------------------------------

    await manager.save(Ticket, ticket);

    return ticket;
  }
 */
  //? ============================================================================================== */

  async confirm(ticketId: number) {
    const queryRunner = this.createTransaction();

    try {
      await this.validateTravelForTicket(ticketId, queryRunner.manager);
      await this.expireTravelReservations(ticketId, queryRunner.manager);

      const ticket = await this.findQrTicketForConfirmation(
        ticketId,
        queryRunner.manager,
      );
      this.applySoldState(ticket);

      await queryRunner.manager.save(Ticket, ticket);
      await queryRunner.commitTransaction();

      return {
        message: 'Ticket payment confirmed successfully',
        ticket: { id: ticket.id, total_price: ticket.total_price },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */

  private async validateTravelForTicket(
    ticketId: number,
    manager: EntityManager,
  ): Promise<void> {
    const travel = await manager.findOne(Travel, {
      where: { tickets: { id: ticketId } },
    });

    if (!travel) {
      throw new NotFoundException('Travel not found');
    }
  }

  //? ============================================================================================== */

  private async expireTravelReservations(
    ticketId: number,
    manager: EntityManager,
  ): Promise<void> {
    const travel = await manager.findOne(Travel, {
      where: { tickets: { id: ticketId } },
      select: { id: true },
    });

    if (travel) {
      await this.ticketExpirationService.expireTravelIfNeeded(
        travel.id,
        manager,
      );
    }
  }

  /*  async confirm(ticketId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const travel = await queryRunner.manager.findOne(Travel, {
        where: { tickets: { id: ticketId } },
      });
      if (!travel) throw new NotFoundException('Travel not found');

      //! --------------------------------------------
      //! Expirar Reservas si es necesario
      //! --------------------------------------------

      await this.ticketExpirationService.expireTravelIfNeeded(
        travel.id,
        queryRunner.manager,
      );

      // --------------------------------------------
      // 1. Buscar ticket con sus relaciones
      // --------------------------------------------

      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')

        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .innerJoinAndSelect('ticket.paymentQr', 'paymentQr')

        .where('ticket.id = :ticketId', { ticketId })

        .andWhere('ticket.status = :status', {
          status: TicketStatus.PENDING_PAYMENT,
        })
        .andWhere('ticket.payment_type = :payment_type', {
          payment_type: PaymentType.QR,
        })
        .andWhere('(ticket.reserve_expiresAt > NOW())')
        .getOne();

      if (!ticket)
        throw new NotFoundException(
          'Ticket not found, expired, or not in a confirmable state',
        );

      // --------------------------------------------
      // 2. Actualizar estados
      // --------------------------------------------

      ticket.status = TicketStatus.SOLD;
      ticket.reserve_expiresAt = null; //! (para la limpieza)

      if (ticket.paymentQr) {
        ticket.paymentQr.status = PaymentStatusEnum.PAID;
      }

      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.SOLD;
      }

      // --------------------------------------------
      // 3. Persistir cambios
      // --------------------------------------------

      await queryRunner.manager.save(Ticket, ticket);
      await queryRunner.commitTransaction();

      return {
        message: 'Ticket payment confirmed successfully',
        ticket: { id: ticket.id, total_price: ticket.total_price },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  } */

  //? ============================================================================================== */
  //?                                    Verify_QR                                                   */
  //? ============================================================================================== */

  async verifyQr(ticketId: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, status: Not(TicketStatus.CANCELLED) },
      relations: { paymentQr: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    if (!ticket.paymentQr) {
      throw new NotFoundException('QR code not found for this ticket');
    }

    return { status: ticket.paymentQr.status };
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number, travelId: number) {
    await this.ticketExpirationService.expireTravelIfNeeded(travelId);

    return this.ticketRepository.find({
      where: {
        travel: {
          id: travelId,
          bus: { owner: { companies: { id: companyId } } },
        },
      },
    });
  }

  //? ============================================================================================== */
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignPassengerBase(data: {
    passengers: PassengerSeatBatchDto[];
    customer: Customer;
    ticketId: number;
  }) {
    const queryRunner = this.createTransaction();

    try {
      await this.expireTravelReservations(data.ticketId, queryRunner.manager);

      await this.assignPassengersToSeats(
        data.passengers,
        data.customer,
        data.ticketId,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      return this.buildAssignmentResponse(data);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */

  private async assignPassengersToSeats(
    passengers: PassengerSeatBatchDto[],
    customer: Customer,
    ticketId: number,
    manager: EntityManager,
  ): Promise<void> {
    for (const item of passengers) {
      const seat = await this.findAndValidateEditableSeat(
        item.seatId,
        ticketId,
        customer.id,
        manager,
      );

      const passenger = await this.passengersService.createBase(
        {
          fullName: item.passenger.name,
          ci: item.passenger.ci,
        },
        customer,
        manager,
      );

      seat.passenger = {
        name: passenger.fullName,
        ci: passenger.ci,
      };

      await manager.save(seat);
    }
  }

  //? ============================================================================================== */

  private async findAndValidateEditableSeat(
    seatId: number,
    ticketId: number,
    customerId: number,
    manager: EntityManager,
  ): Promise<TravelSeat> {
    const seat = await manager
      .createQueryBuilder(TravelSeat, 'seat')
      .leftJoinAndSelect('seat.ticket', 'ticket')
      .where('seat.id = :seatId', { seatId })
      .andWhere('ticket.id = :ticketId', { ticketId })
      .andWhere('ticket.buyerId = :customerId', { customerId })
      .andWhere('ticket.status = :status', {
        status: TicketStatus.RESERVED,
      })
      .getOne();

    if (!seat) {
      throw new BadRequestException(
        `Seat ${seatId} is not editable or does not belong to this ticket`,
      );
    }

    return seat;
  }

  //? ============================================================================================== */

  private buildAssignmentResponse(data: {
    passengers: PassengerSeatBatchDto[];
    ticketId: number;
  }) {
    return {
      message: 'Passengers assigned successfully',
      ticketId: data.ticketId,
      assignedSeats: data.passengers.map((p) => ({
        seatId: p.seatId,
        ci: p.passenger.ci,
      })),
    };
  }

  /* async assignPassengerBase(data: {
    passengers: PassengerSeatBatchDto[];
    customer: Customer;
    ticketId: number;
  }) {
    const { passengers, customer, ticketId } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    try {
      const travel = await queryRunner.manager.findOne(Travel, {
        where: { tickets: { id: data.ticketId } },
        select: { id: true },
      });

      if (!travel) {
        throw new NotFoundException('Travel not found');
      }

      await this.ticketExpirationService.expireTravelIfNeeded(
        travel.id,
        queryRunner.manager,
      );
      for (const item of passengers) {
        const seat = await queryRunner.manager
          .createQueryBuilder(TravelSeat, 'seat')
          .leftJoinAndSelect('seat.ticket', 'ticket')
          .where('seat.id = :seatId', { seatId: item.seatId })
          .andWhere('ticket.id = :ticketId', { ticketId })
          .andWhere('ticket.buyerId = :customerId', {
            customerId: customer.id,
          })
          .andWhere('ticket.status = :status', {
            status: TicketStatus.RESERVED,
          })
          .getOne();

        if (!seat) {
          throw new BadRequestException(`Seat ${item.seatId} not editable`);
        }

        const passenger = await this.passengersService.createBase(
          {
            fullName: item.passenger.name,
            ci: item.passenger.ci,
          },
          customer,
          queryRunner.manager,
        );

        seat.passenger = {
          name: passenger.fullName,
          ci: passenger.ci,
        };

        await queryRunner.manager.save(seat);
      }
      await queryRunner.commitTransaction();
      return {
        message: 'Passengers assigned successfully',
        ticketId,
        assignedSeats: passengers.map((p) => ({
          seatId: p.seatId,
          ci: p.passenger.ci,
        })),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } */

  //? ============================================================================================== */
  //?                                      Functions                                                 */
  //? ============================================================================================== */

  private createTransaction(): QueryRunner {
    const queryRunner = this.dataSource.createQueryRunner();
    queryRunner.connect();
    queryRunner.startTransaction();
    return queryRunner;
  }
}
