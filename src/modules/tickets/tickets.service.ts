import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { envs } from 'src/config/environments/environments';

import {
  CreateTicketInOfficeDto,
  CreateTicketInAppDto,
  SelectedSeatsDto,
} from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { TravelStatus } from '../travels/enums/travel-status.enum';
import { SaleType } from '../travels/enums/sale_type-enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { TicketType } from './enums/ticket-type.enum';
import { SeatStatus } from 'src/common/enums';

import { CustomersService } from '../customers/customers.service';

import { TravelSeat } from '../travels/entities/travel-seat.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Travel } from '../travels/entities/travel.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    private readonly customersService: CustomersService,

    private dataSource: DataSource,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                         Create_Ticket_In_Office                                                */
  //? ---------------------------------------------------------------------------------------------- */

  async createTicketInOffice(dto: CreateTicketInOfficeDto, user: User) {
    return this.createTicketBase({
      dto,
      user,
      type: TicketType.IN_OFFICE,
    });
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                           Create_Ticket_In_App                                                 */
  //? ---------------------------------------------------------------------------------------------- */

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

  //? ---------------------------------------------------------------------------------------------- */
  //?                                   Create_Base                                                  */
  //? ---------------------------------------------------------------------------------------------- */

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
    const { travelUUID, seatSelections } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --------------------------------------------------------------------------
      // 1. Obtener Viaje
      // --------------------------------------------------------------------------

      const travel = await queryRunner.manager.findOne(Travel, {
        where: { id: travelUUID },
        relations: { bus: true },
      });

      if (!travel) throw new NotFoundException('Travel not found');
      if (travel.travel_status !== TravelStatus.ACTIVE)
        throw new BadRequestException('Travel is not active');

      // --------------------------------------------------------------------------
      // 2. Obtener Seats
      // --------------------------------------------------------------------------

      const seatIds = seatSelections.map((s) => s.seatId);
      const seats = await queryRunner.manager
        .createQueryBuilder(TravelSeat, 'seat')
        .setLock('pessimistic_write')
        .where('seat.id IN (:...seatIds)', { seatIds })
        .andWhere('seat.travelId = :travelUUID', { travelUUID })
        .andWhere('seat.deletedAt IS NULL')
        .andWhere('seat.travel_status = :active', {
          active: TravelStatus.ACTIVE,
        })
        .andWhere(
          `(seat.status = :available OR 
              (seat.status = :reserved AND seat.reserve_expiresAt <= NOW()))`,
          { available: SeatStatus.AVAILABLE, reserved: SeatStatus.RESERVED },
        )
        .getMany();

      // --------------------------------------------------------------------------
      // 3. Validar disponibilidad de asientos y que no sean espacios
      // --------------------------------------------------------------------------

      //! valida que los asientos no sean "0" (espacios sin asiento)
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

      // --------------------------------------------------------------------------
      // 4. Obtener o crear customer
      // --------------------------------------------------------------------------

      if (type === TicketType.IN_OFFICE && !buyer) {
        const officeDto = dto as CreateTicketInOfficeDto;
        buyer = await this.customersService.create(
          { ci: officeDto.customerCI, name: officeDto.customerName },
          queryRunner.manager,
        );
      }

      // --------------------------------------------------------------------------
      // 5. Calcular precios y marcar asientos como reservados
      // --------------------------------------------------------------------------

      const expires = this.getReservationExpiry();
      let totalPrice = 0;

      for (const seat of seats) {
        const selection = seatSelections.find(
          (s) => s.seatId.toString() === seat.id.toString(),
        );
        const finalPrice = this.resolveSeatPrice(selection, seat, travel);
        seat.price = finalPrice.toFixed(2);
        seat.status = SeatStatus.RESERVED;
        seat.reserve_expiresAt = expires;
        totalPrice += finalPrice;
      }

      // --------------------------------------------------------------------------
      // 6. Crear ticket
      // --------------------------------------------------------------------------

      const seatsArray: SelectedSeatsDto[] = seats.map((s) => {
        return {
          seatNumber: s.seatNumber,
          price: s.price,
        };
      });

      //! Crear ticket
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

      // --------------------------------------------------------------------------
      // 7. Persistir cambios
      // --------------------------------------------------------------------------

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

  // ------------------------------------------------------------------
  // get reservation expiry
  // ------------------------------------------------------------------

  private getReservationExpiry(): Date {
    const minutes = envs.RESERVATION_EXPIRE_MINUTES || 10;
    const now = new Date();
    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  // ------------------------------------------------------------------
  // resolve seat price
  // ------------------------------------------------------------------

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

  //? ---------------------------------------------------------------------------------------------- */
  //?                         Confirm_Ticket_Manual                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async confirmTicketManual(ticketUUID: string, user: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --------------------------------------------------------------------------
      // 1. Buscar ticket con sus relaciones
      // --------------------------------------------------------------------------

      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .innerJoinAndSelect('ticket.travel', 'travel')
        .where('ticket.id = :ticketUUID', { ticketUUID })

        .andWhere('ticket.travel.bus.owner.company = :company', {
          company: user.company?.id, //! solo de la misma empresa
        })

        .andWhere('ticket.status = :status', { status: TicketStatus.RESERVED })
        .andWhere('ticket.type = :type', { type: TicketType.IN_OFFICE }) //! solo en office
        .andWhere(
          '(ticket.reserve_expiresAt IS NULL OR ticket.reserve_expiresAt > NOW())',
        )
        .getOne();

      if (!ticket)
        throw new NotFoundException(
          'Ticket not found, expired, or not in a confirmable state',
        );

      // --------------------------------------------------------------------------
      // 2. Actualizar estados (delegado a métodos dedicados)
      // --------------------------------------------------------------------------

      ticket.status = TicketStatus.SOLD;
      ticket.reserve_expiresAt = null; //! (para la limpieza)

      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.SOLD;
        seat.sale_type = SaleType.OFFICE;
        seat.reserve_expiresAt = null; //! (para la limpieza)
      }

      // --------------------------------------------------------------------------
      // 3. Persistir cambios
      // --------------------------------------------------------------------------

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

  //? ---------------------------------------------------------------------------------------------- */
  //?                                    Generate_Qr                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  generateQr() {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                              Confirm_Ticket_QR                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async confirmOrderQr(qrDataInterface: any) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 Cancel_Ticket                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async cancelTicket(ticketUUID: string, user: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --------------------------------------------------------------------------
      // 1. Buscar ticket con sus relaciones
      // --------------------------------------------------------------------------

      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .innerJoinAndSelect('ticket.travel', 'travel')
        .where('ticket.id = :ticketUUID', { ticketUUID })

        .andWhere('ticket.travel.bus.owner.company = :company', {
          company: user.company?.id, //! solo de la misma empresa
        })

        //.andWhere('travel.departure_time > NOW()')
        .andWhere('ticket.type = :type', { type: TicketType.IN_OFFICE }) //! solo en office
        .andWhere(
          '(ticket.reserve_expiresAt IS NULL OR ticket.reserve_expiresAt > NOW())',
        )
        .getOne();

      if (!ticket) throw new NotFoundException('Ticket not found or expired');

      // --------------------------------------------------------------------------
      // 2. Validaciones de negocio
      // --------------------------------------------------------------------------

      if (!this.isTicketCancelable(ticket)) {
        throw new BadRequestException(
          `Cannot cancel a ticket with status "${ticket.status}"`,
        );
      }

      /* if (this.hasTravelDeparted(ticket.travel)) {
        throw new BadRequestException(
          'Cannot cancel a ticket for a travel that has already departed',
        );
      } */

      // --------------------------------------------------------------------------
      // 3. Actualizar estados (delegado a métodos dedicados)
      // --------------------------------------------------------------------------

      ticket.status = TicketStatus.CANCELLED;
      ticket.reserve_expiresAt = null;

      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.AVAILABLE;
        seat.sale_type = SaleType.UNSOLD;
        seat.reserve_expiresAt = null; //! opcional, (para la limpieza)
        seat.ticket = null; //! desasociar el asiento del ticket
        seat.price = '0'; //! resetear el precio
      }

      // --------------------------------------------------------------------------
      // 4. Persistir cambios
      // --------------------------------------------------------------------------

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

  // ------------------------------------------------------------------
  // is ticket cancelable
  // ------------------------------------------------------------------

  private isTicketCancelable(ticket: Ticket): boolean {
    return [TicketStatus.RESERVED, TicketStatus.SOLD].includes(ticket.status);
  }
  // ------------------------------------------------------------------
  // has travel departed
  // ------------------------------------------------------------------

  private hasTravelDeparted(travel: Travel): boolean {
    return travel.departure_time <= new Date();
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(user: User) {
    const tickets = await this.ticketRepository.find({
      where: { travel: { bus: { owner: { company: user.company } } } },
    });
    return tickets;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string, user: User) {
    const ticket = await this.ticketRepository.findOneBy({
      id,
      travel: { bus: { owner: { company: user.company } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }
}
