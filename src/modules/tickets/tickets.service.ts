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
  AssignPassengerInAppDto,
  CreateTicketInOfficeDto,
  AssignPassengerInOfficeDto,
} from './dto';

import { SeatStatus } from 'src/common/enums';
import { TicketType } from './enums/ticket-type.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { SaleType } from '../travels/enums/sale_type-enum';
import { TravelStatus } from '../travels/enums/travel-status.enum';

import { CustomersService } from '../customers/customers.service';

import { Ticket } from './entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Passenger } from '../customers/entities/passenger.entity';
import { TravelSeat } from '../travels/entities/travel-seat.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(TravelSeat)
    private readonly travelSeatRepository: Repository<TravelSeat>,

    @InjectRepository(Passenger)
    private readonly passengerRepository: Repository<Passenger>,

    private readonly customersService: CustomersService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                           Create_Ticket_Cashier                                                */
  //? ============================================================================================== */

  async createTicketInOffice(dto: CreateTicketInOfficeDto, user: User) {
    return this.createTicketBase({
      dto,
      user,
      type: TicketType.IN_OFFICE,
    });
  }

  //? ============================================================================================== */
  //?                              Create_Ticket_APP                                                 */
  //? ============================================================================================== */

  async createTicketInApp(dto: CreateTicketInAppDto, buyer: Customer) {
    if (!(buyer instanceof Customer)) {
      throw new BadRequestException('Only customers can create Tickets in App');
    }
    return this.createTicketBase({
      dto,
      buyer,
      type: TicketType.IN_APP,
    });
  }

  //* ============================================================================================== */

  private async createTicketBase({
    dto,
    buyer,
    user,
    type,
  }: {
    dto: CreateTicketInAppDto | CreateTicketInOfficeDto;
    buyer?: Customer;
    user?: User;
    type: TicketType;
  }) {
    const { travelId, seatSelections } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --------------------------------------------
      // 1. Obtener Viaje
      // --------------------------------------------

      const travel = await queryRunner.manager.findOne(Travel, {
        where: { id: travelId },
        relations: { bus: true },
      });

      //! Validaciones de Travel
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
        .andWhere(
          `(seat.status = :available OR 
              (seat.status = :reserved))`,
          { available: SeatStatus.AVAILABLE, reserved: SeatStatus.RESERVED },
        )
        .getMany();

      // --------------------------------------------
      // 3. Validar disponibilidad de asientos y que no sean espacios
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

      //! obtener el tiempo de expiracion de reservas
      const expires = this.getReservationExpiry();

      const ticket = queryRunner.manager.create(Ticket, {
        type,
        travel,
        buyer,
        seats: seatsArray,
        soldBy: type === TicketType.IN_OFFICE ? user : null,
        travelSeats: seats,
        total_price: totalPrice.toFixed(2),
        reserve_expiresAt: expires,
      });

      // --------------------------------------------
      // 7. Persistir cambios
      // --------------------------------------------

      await queryRunner.manager.save(ticket);
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
  //?                         Confirm_Ticket_Manual                                                  */
  //? ============================================================================================== */

  async confirmTicketManual(ticketId: number, cashier: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --------------------------------------------
      // 1. Buscar ticket con sus relaciones
      // --------------------------------------------

      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')

        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .innerJoinAndSelect('ticket.travel', 'travel')

        .innerJoin('travel.bus', 'bus')

        .where('ticket.id = :ticketId', { ticketId })
        .andWhere('bus.companyId = :companyId', {
          companyId: cashier.office?.company.id, //! Solo de la misma empresa
        })
        .andWhere('ticket.status = :status', {
          status: TicketStatus.RESERVED, //! Solo los reservados
        })
        .andWhere('ticket.type = :type', {
          type: TicketType.IN_OFFICE, //! Solo en office
        })
        .andWhere('(ticket.reserve_expiresAt > NOW())') //! No expirado
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

      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.SOLD;
        seat.sale_type = SaleType.OFFICE;
      }

      // --------------------------------------------
      // 3. Persistir cambios
      // --------------------------------------------

      await queryRunner.manager.save(Ticket, ticket);
      await queryRunner.commitTransaction();

      return {
        message: 'Ticket payment confirmed successfully',
        ticketId: ticket.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                                    Generate_Qr                                                 */
  //? ============================================================================================== */

  generateQr() {}

  //? ============================================================================================== */
  //?                              Confirm_Ticket_QR                                                 */
  //? ============================================================================================== */

  async confirmOrderQr(qrDataInterface: any) {}

  //? ============================================================================================== */
  //?                                 Cancel_Ticket                                                  */
  //? ============================================================================================== */

  async cancelTicket(ticketId: number, cashier: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --------------------------------------------
      // 1. Buscar ticket con sus relaciones
      // --------------------------------------------

      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')

        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .innerJoinAndSelect('ticket.travel', 'travel')

        .innerJoin('travel.bus', 'bus')
        .innerJoin('bus.owner', 'owner')
        .innerJoin('owner.companies', 'company')

        .where('ticket.id = :ticketId', { ticketId }) //! Por ID
        .andWhere('company.id = :companyId', {
          companyId: cashier.office?.company.id, //! Solo de la misma empresa
        })
        .andWhere('ticket.status IN (:...statuses)', {
          statuses: [TicketStatus.SOLD, TicketStatus.RESERVED], //! Solo los vendidos o reservados
        })
        .andWhere('ticket.type = :type', { type: TicketType.IN_OFFICE }) //! Solo en office
        .andWhere(
          '(ticket.reserve_expiresAt IS NULL OR ticket.reserve_expiresAt > NOW())', //! No expirado
        )
        .getOne();

      if (!ticket) throw new NotFoundException('Ticket not found or expired');

      // --------------------------------------------
      // 2. Validaciones de negocio
      // --------------------------------------------

      if (!this.isTicketCancelable(ticket)) {
        throw new BadRequestException(
          `Cannot cancel a ticket with status "${ticket.status}"`,
        );
      }

      if (this.hasTravelDeparted(ticket.travel)) {
        throw new BadRequestException(
          'Cannot cancel a ticket for a travel that has already departed',
        );
      }

      // --------------------------------------------
      // 3. Actualizar estados
      // --------------------------------------------

      switch (ticket.status) {
        case TicketStatus.SOLD:
          ticket.status = TicketStatus.CANCELLED;
          ticket.reserve_expiresAt = null;
          break;

        case TicketStatus.RESERVED:
          ticket.status = TicketStatus.CANCELLED;
          ticket.reserve_expiresAt = null;
          ticket.deletedAt = new Date();
          break;
      }

      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.AVAILABLE;
        seat.sale_type = SaleType.UNSOLD;
        seat.ticket = null; //! desasociar el asiento del ticket
        seat.price = '0'; //! resetear el precio
        seat.passenger = null; //! desasociar el pasajero
      }

      // --------------------------------------------
      // 4. Persistir cambios
      // --------------------------------------------

      await queryRunner.manager.save(Ticket, ticket);
      await queryRunner.commitTransaction();

      return {
        message: 'Ticket canceled successfully',
        ticketId: ticket.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //* ============================================================================================== */

  private isTicketCancelable(ticket: Ticket): boolean {
    return [TicketStatus.RESERVED, TicketStatus.SOLD].includes(ticket.status);
  }

  //* ============================================================================================== */

  private hasTravelDeparted(travel: Travel): boolean {
    return travel.departure_time <= new Date();
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(admin: User) {
    const tickets = await this.ticketRepository.find({
      where: {
        travel: {
          bus: { owner: { companies: admin.company } },
        },
      },
    });
    return tickets;
  }

  //? ============================================================================================== */

  async findAllForCashier(travelId: number, cashier: User) {
    const tickets = await this.ticketRepository.find({
      where: {
        travel: { id: travelId },
        soldBy: { id: cashier.id },
      },
    });
    return tickets;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, admin: User) {
    const ticket = await this.ticketRepository.findOneBy({
      id,
      travel: {
        bus: { owner: { companies: admin.company } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  //? ============================================================================================== */
  //?                           Assign_Passenger_APP                                                 */
  //? ============================================================================================== */

  //!  APP
  async assignPassengerForCustomer(
    dto: AssignPassengerInAppDto,
    customer: Customer,
  ) {
    return this.assignPassengerBase(
      dto.ticketId,
      dto.seatId,
      dto.passengerId,
      customer,
    );
  }

  //? ============================================================================================== */
  //?                       Assign_Passenger_Cashier                                                 */
  //? ============================================================================================== */

  //!  CASHIER
  async assignPassengerForCashier(dto: AssignPassengerInOfficeDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return this.assignPassengerBase(
      dto.ticketId,
      dto.seatId,
      dto.passengerId,
      customer,
    );
  }

  //* ============================================================================================== */

  private async assignPassengerBase(
    ticketId: number,
    seatId: number,
    passengerId: number,
    customer: Customer,
  ) {
    const seat = await this.travelSeatRepository
      .createQueryBuilder('seat')
      .leftJoinAndSelect('seat.ticket', 'ticket')
      .where('seat.id = :seatId', { seatId })
      .andWhere('ticket.id = :ticketId', { ticketId })
      .andWhere('ticket.buyerId = :customerId', {
        customerId: customer.id,
      })
      .andWhere('ticket.status IN (:...statuses)', {
        statuses: [TicketStatus.RESERVED],
      })
      .getOne();

    if (!seat) {
      throw new BadRequestException('Seat not editable');
    }

    const passenger = await this.passengerRepository.findOne({
      where: {
        id: passengerId,
        customer: { id: customer.id },
      },
    });

    if (!passenger) {
      throw new NotFoundException('Passenger not found');
    }

    seat.passenger = {
      name: passenger.fullName,
      ci: passenger.ci,
    };

    return this.travelSeatRepository.save(seat);
  }
}
