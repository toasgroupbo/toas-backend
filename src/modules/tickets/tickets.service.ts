import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { envs } from 'src/config/environments/environments';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import {
  SelectedSeatsDto,
  CreateTicketInAppDto,
  CreateTicketInOfficeDto,
} from './dto';

import { SeatStatus } from 'src/common/enums';
import { TicketType } from './enums/ticket-type.enum';
import { PaymentType } from './enums/payment-type.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { TravelStatus } from '../travels/enums/travel-status.enum';
import { PaymentStatusEnum } from '../payments/enum/payment-status.enum';

import { PassengerSeatBatchDto } from './dto/assign-passengers-batch-in-app.dto';

import { PenaltiesService } from '../customers/penalties.service';
import { CustomersService } from '../customers/customers.service';
import { TicketExpirationService } from './services/ticket-expiration.service';

import { Ticket } from './entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Setting } from '../settings/entities/setting.entity';
import { Customer } from '../customers/entities/customer.entity';
import { TravelSeat } from '../travels/entities/travel-seat.entity';
import { PassengersService } from '../customers/passengers.service';

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
    const { travelId, seatSelections } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    await this.ticketExpirationService.expireTravelIfNeeded(
      travelId,
      queryRunner.manager,
    );

    try {
      // --------------------------------------------
      // 1. Obtener Viaje y validar
      // --------------------------------------------

      const travel = await queryRunner.manager.findOne(Travel, {
        where: { id: travelId },
        relations: { bus: true },
      });
      if (!travel) throw new NotFoundException('Travel not found');

      if (travel.travel_status !== TravelStatus.ACTIVE)
        throw new BadRequestException('Travel is not active');

      // --------------------------------------------
      // 2. Obtener Seats
      // --------------------------------------------

      const seatIds = seatSelections.map((s) => s.seatId);
      const seats = await queryRunner.manager
        .createQueryBuilder(TravelSeat, 'seat')
        .setLock('pessimistic_write')
        .where('seat.id IN (:...seatIds)', { seatIds })
        .andWhere('seat.travelId = :travelId', { travelId })
        .andWhere('seat.deletedAt IS NULL')
        .andWhere(`(seat.status = :available )`, {
          available: SeatStatus.AVAILABLE,
        })
        .getMany();

      // --------------------------------------------
      // 3. Validar disponibilidad y que no sean espacios
      // --------------------------------------------

      const seatsCleaned = [...seats];
      for (const seat of seats) {
        if (seat.seatNumber === '0') {
          seatsCleaned.splice(seatsCleaned.indexOf(seat), 1);
        }
      }

      if (seatsCleaned.length !== seatIds.length) {
        const foundIds = seatsCleaned.map((s) => s.id.toString());
        const missing = seatIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `Some seats are unavailable or already sold: ${missing.join(', ')}`,
        );
      }

      // --------------------------------------------
      // 4. Obtener el customer
      // --------------------------------------------

      if (type === TicketType.IN_OFFICE && !buyer) {
        const officeDto = dto as CreateTicketInOfficeDto;
        buyer = await this.customersService.findOne(
          officeDto.customerId,
          queryRunner.manager,
        );
      }

      // --------------------------------------------
      // 5. Calcular precios y cambiar estados
      // --------------------------------------------
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

      // --------------------------------------------
      // 6. Crear ticket y actualizar seats
      // --------------------------------------------

      const seatsArray: SelectedSeatsDto[] = seats.map((s) => {
        return {
          id: s.id,
          seatNumber: s.seatNumber,
          price: s.price,
        };
      });

      const expires = this.getReservationExpiry(); //! get fecha de expiracion
      let commission = 0;

      if (type === TicketType.IN_APP) {
        const settings = await queryRunner.manager.find(Setting); //! se añade la commission al ticket solo si es en app
        commission = settings[0].commission || 0;
      }

      const ticket = queryRunner.manager.create(Ticket, {
        type,
        travel,
        buyer,
        seats: seatsArray,
        soldBy: type === TicketType.IN_OFFICE ? user : null,
        travelSeats: seats,
        total_price: totalPrice.toFixed(2),
        reserve_expiresAt: expires,
        payment_type: paymentType,
        commission: commission.toString(), //! comission
      });

      // --------------------------------------------
      // 7. Persistir cambios
      // --------------------------------------------

      await queryRunner.manager.save(ticket);

      // --------------------------------------------
      // 8. Logica de penalizacion
      // --------------------------------------------

      if (buyer && !user)
        await this.penaltiesService.registerFailure(buyer, queryRunner.manager);

      await queryRunner.commitTransaction();

      return ticket;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //* ============================================================================================== */

  private getReservationExpiry(): Date {
    const minutes = envs.RESERVATION_EXPIRE_MINUTES || 10;
    const now = new Date();
    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  //* ============================================================================================== */

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

  async confirm(ticketId: number) {
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
  }

  //? ============================================================================================== */
  //?                                    Verify_QR                                                   */
  //? ============================================================================================== */

  async verifyQr(ticketId: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, status: TicketStatus.PENDING_PAYMENT },
      relations: { paymentQr: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!ticket.paymentQr)
      throw new NotFoundException('QR code not found for this ticket');

    return { status: ticket.paymentQr.status };
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number, travelId: number) {
    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    await this.ticketExpirationService.expireTravelIfNeeded(travelId);

    const tickets = await this.ticketRepository.find({
      where: {
        travel: {
          id: travelId,
          bus: { owner: { companies: { id: companyId } } },
        },
      },
    });
    return tickets;
  }

  //? ============================================================================================== */
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignPassengerBase(data: {
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
      return { message: 'Passengers assigned successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
