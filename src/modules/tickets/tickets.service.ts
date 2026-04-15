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

import { MailService } from 'src/mail/mail.service';
import { BillingsService } from './billings.service';
import { WalletService } from '../wallet/wallet.service';
import { PenaltiesService } from '../customers/penalties.service';
import { PassengersService } from '../customers/passengers.service';
import { TicketExpirationService } from './ticket-expiration.service';

import { Ticket } from './entities/ticket.entity';
import { Billing } from './entities/billing.entity';
import { User } from '../users/entities/user.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Setting } from '../settings/entities/setting.entity';
import { Penalty } from '../customers/entities/penalty.entity';
import { Customer } from '../customers/entities/customer.entity';
import { TravelSeat } from '../travels/entities/travel-seat.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    @InjectRepository(Penalty)
    private readonly penalityRepository: Repository<Penalty>,

    private readonly penaltiesService: PenaltiesService,
    private readonly ticketExpirationService: TicketExpirationService,
    private readonly passengersService: PassengersService,
    private readonly walletService: WalletService,
    private readonly billingService: BillingsService,

    private readonly mailService: MailService,
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
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const manager = queryRunner.manager;

      await this.ticketExpirationService.expireTravelIfNeeded(
        dto.travelId,
        manager,
      );

      //! validacion del travel y obtencion
      const travel = await this.findActiveTravel(dto.travelId, manager);

      const seats = await this.getAndValidateAvailableSeats(
        dto.travelId,
        dto.seatSelections,
        manager,
      );

      let billing: Billing | null = null;
      if (type === TicketType.IN_OFFICE) {
        const officeDto = dto as CreateTicketInOfficeDto;
        billing = await this.billingService.createOrUpdateBilling(
          officeDto.billing,
          manager,
        );
      }

      const { seatsWithPrices, totalPrice } =
        await this.calculateAndUpdateSeatPrices(
          seats,
          dto.seatSelections,
          travel,
          manager,
        );

      const commission = await this.calculateCommission(type, manager);
      const totalTicketAmount = totalPrice + commission;

      const { walletAmount, qrAmount } = await this.resolvePaymentAmounts({
        type,
        buyer,
        totalTicketAmount,
        manager,
        paymentType,
      });

      const ticket = await this.createTicket(manager, {
        type,
        travel,
        buyer: type === TicketType.IN_APP ? buyer : null,
        soldBy: type === TicketType.IN_OFFICE ? user : null,

        seats: seats.map((seat) => ({
          id: seat.id,
          seatNumber: seat.seatNumber,
          price: seat.price,
        })),

        travelSeats: seatsWithPrices,
        reserve_expiresAt: this.getReservationExpiry(),
        payment_type: paymentType,
        commission: commission.toString(),

        total_price: totalPrice.toFixed(2),
        wallet_amount: walletAmount.toFixed(2),
        qr_amount: qrAmount.toFixed(2),
        status: TicketStatus.RESERVED,

        billing: billing ?? null, //! null si es en app (momentaneo)
      });

      //! Penalty
      if (type === TicketType.IN_APP && buyer) {
        await this.registerPenalty(buyer, user, manager);
      }

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

  private async resolvePaymentAmounts({
    type,
    buyer,
    totalTicketAmount,
    manager,
    paymentType,
  }: {
    type: TicketType;
    buyer?: Customer;
    totalTicketAmount: number;
    manager: EntityManager;
    paymentType: PaymentType;
  }) {
    let walletAmount = 0;
    let qrAmount = 0;

    // APP (wallet + QR)
    if (type === TicketType.IN_APP && buyer) {
      const availableBalance = await this.walletService.getAvailableBalance({
        customer: buyer,
        manager,
      });

      walletAmount = Math.min(availableBalance, totalTicketAmount);
      qrAmount = totalTicketAmount - walletAmount;
    }

    // OFICINA + QR
    else if (type === TicketType.IN_OFFICE && paymentType === PaymentType.QR) {
      qrAmount = totalTicketAmount;
    }

    //  OFICINA + CASH (no QR)
    else if (
      type === TicketType.IN_OFFICE &&
      paymentType === PaymentType.CASH
    ) {
      walletAmount = 0;
      qrAmount = 0;
    }

    return { walletAmount, qrAmount };
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

    if (travel.enabled === false) {
      throw new BadRequestException(`Travel ${travelId} is not enable`);
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

    const validSeats = seats.filter((seat) => seat.seatNumber !== '0');

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

  private async calculateCommission(
    type: TicketType,
    manager: EntityManager,
  ): Promise<number> {
    if (type === TicketType.IN_APP) {
      const settings = await manager.find(Setting);
      return Number(settings[0]?.commission) || 0;
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

  private async registerPenalty(
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

  /* async confirmTicketQR(ticketId: number): Promise<Ticket> {
    try {
      const ticket = await this.ticketRepository.findOne({
        where: { id: ticketId },
        relations: {
          travel: {
            route: {
              officeOrigin: true,
              officeDestination: true,
            },
            bus: { busType: true },
          },
          travelSeats: true,
          buyer: true,
          billing: true,
        },
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket ${ticketId} not found`);
      }

      // 2. Aplicar estado SOLD
      this.applySoldState(ticket);
      await this.reducePenalty(ticket);

      // 3. Guardar cambios
      await this.ticketRepository.save(ticket);

      if (ticket.type === TicketType.IN_APP && ticket.buyer) {
        this.sendPaymentConfirmationEmail(ticket).catch((error) => {
          console.error(`Error sending email for ticket ${ticket.id}:`, error);
        });
      }

      return ticket;
    } catch (error) {
      throw error;
    }
  }
 */
  async confirmWithManager(ticket: Ticket, manager: EntityManager) {
    this.applySoldState(ticket);
    await this.reducePenalty(ticket, manager);

    await manager.save(Ticket, ticket);

    if (ticket.type === TicketType.IN_APP && ticket.buyer) {
      this.sendPaymentConfirmationEmail(ticket).catch((error) => {
        console.error(`Error sending email for ticket ${ticket.id}:`, error);
      });
    }

    return ticket;
  }

  //? ============================================================================================== */

  private applySoldState(ticket: Ticket) {
    ticket.status = TicketStatus.SOLD;
    ticket.reserve_expiresAt = null;

    for (const seat of ticket.travelSeats) {
      seat.status = SeatStatus.SOLD;
    }
  }

  //? ============================================================================================== */

  /* private async reducePenalty(ticket: Ticket): Promise<void> {
    if (ticket.type === TicketType.IN_APP && ticket.buyer) {
      const penalty = await this.penalityRepository.findOne({
        where: { customer: { id: ticket.buyer.id } },
      });

      if (penalty && penalty.failedCount > 0) {
        penalty.failedCount -= 1;
        await this.penalityRepository.save(penalty);
      }
    }
  }
 */
  private async reducePenalty(
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

  //? ============================================================================================== */

  private async sendPaymentConfirmationEmail(ticket: Ticket) {
    try {
      const travel = ticket.travel;
      const route = travel.route;
      const buyer = ticket.buyer!;

      const mailDto = {
        to: buyer.email,
        ticketNumber: `TK-${ticket.id.toString().padStart(6, '0')}`,
        ticketDate: new Date(ticket.createdAt).toLocaleDateString('es-BO'),
        totalPrice: Number(ticket.total_price),

        customerName: buyer.name || 'Cliente',
        customerEmail: buyer.email,
        customerPhone: buyer.phone || 'No registrado',

        origin: route.officeOrigin?.name,
        destination: route.officeDestination?.name,
        departureDate: this.formatDateTime(travel.departure_time),
        arrivalDate: this.formatDateTime(travel.arrival_time),
        duration: this.calculateDuration(
          travel.departure_time,
          travel.arrival_time,
        ),
        terminalAddress: route.officeOrigin?.address || 'Terminal Central',

        passengers: ticket.travelSeats.map((seat) => ({
          name: seat.passenger?.name || 'pasajero',
          ci: seat.passenger?.ci || 'No registrado',
          seat: seat.seatNumber,
          deck: seat.deck?.toString() || '1',
        })),
      };

      await this.mailService.sendMail(mailDto);
    } catch (error) {
      console.log(error);
    }
  }

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
    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(
        travelId,
        manager,
      );

      return await manager.find(Ticket, {
        where: {
          travel: {
            id: travelId,
            bus: { owner: { companies: { id: companyId } } },
          },
        },
      });
    });
  }

  //? ============================================================================================== */
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignPassengerBase(data: {
    passengers: PassengerSeatBatchDto[];
    ticketId: number;
    customer?: Customer;
  }) {
    const queryRunner = this.createTransaction();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await this.expireTravelReservations(data.ticketId, queryRunner.manager);

      await this.assignPassengersToSeats(
        data.passengers,
        data.ticketId,
        queryRunner.manager,
        data.customer,
      );

      await queryRunner.commitTransaction();

      return this.buildAssignmentResponse({
        ticketId: data.ticketId,
        passengers: data.passengers,
      });
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
    ticketId: number,
    manager: EntityManager,
    customer?: Customer,
  ): Promise<void> {
    for (const item of passengers) {
      const seat = await this.findAndValidateEditableSeat(
        item.seatId,
        ticketId,
        manager,
        //customer?.id,
      );

      const passenger = await this.passengersService.createBase(
        {
          fullName: item.passenger.name,
          ci: item.passenger.ci,
        },
        manager,
        customer,
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
    manager: EntityManager,
    //customerId?: number,
  ): Promise<TravelSeat> {
    const seat = await manager
      .createQueryBuilder(TravelSeat, 'seat')
      .leftJoinAndSelect('seat.ticket', 'ticket')
      .where('seat.id = :seatId', { seatId })
      .andWhere('ticket.id = :ticketId', { ticketId })
      //.andWhere('ticket.buyerId = :customerId', { customerId })
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
        //name: p.passenger.name,
        ci: p.passenger.ci,
      })),
    };
  }

  //? ============================================================================================== */
  //?                                      Functions                                                 */
  //? ============================================================================================== */

  private createTransaction(): QueryRunner {
    return this.dataSource.createQueryRunner();
  }

  //? ============================================================================================== */

  private formatDateTime(date: Date): string {
    if (!date) return 'No especificada';
    return new Date(date).toLocaleString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private calculateDuration(departure: Date, arrival: Date): string {
    if (!departure || !arrival) return 'No especificada';
    const diffMs = new Date(arrival).getTime() - new Date(departure).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHours}h ${diffMinutes}min`;
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
}
