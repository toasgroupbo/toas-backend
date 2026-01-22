import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateTicketInAppDto, AssignPassengerInAppDto } from './dto';

import { SeatStatus } from 'src/common/enums';
import { TicketType } from './enums/ticket-type.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { SaleType } from '../travels/enums/sale_type-enum';

import { TicketsService } from './tickets.service';

import { Ticket } from './entities/ticket.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Customer } from '../customers/entities/customer.entity';

import { TicketExpirationService } from './services/ticket-expiration.service';

@Injectable()
export class TicketsInAppService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    private readonly ticketsService: TicketsService,

    private readonly ticketExpirationService: TicketExpirationService,

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
    });
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findAll(customer: Customer) {
    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    const travelsToExpire = await this.travelRepository.find({
      select: { id: true },
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
  //?                                    Generate_Qr                                                 */
  //? ============================================================================================== */

  async generateQr() {}

  //? ============================================================================================== */
  //?                                     Confirm_QR                                                 */
  //? ============================================================================================== */

  async confirmQr() {}

  //? ============================================================================================== */
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  async cancel(ticketId: number, customer: Customer) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //! --------------------------------------------
      //! Expirar Reservas si es necesario
      //! --------------------------------------------

      const ticketForTravel = await queryRunner.manager.findOne(Ticket, {
        where: { id: ticketId },
        select: { id: true, travel: true },
        relations: { travel: true },
      });

      if (ticketForTravel) {
        await this.ticketExpirationService.expireTravelIfNeeded(
          ticketForTravel.travel.id,
          queryRunner.manager,
        );
      }

      // --------------------------------------------
      // 1. Buscar ticket con sus relaciones
      // --------------------------------------------

      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')

        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .innerJoinAndSelect('ticket.travel', 'travel')

        //.innerJoin('travel.bus', 'bus')
        //.innerJoin('bus.owner', 'owner')
        //.innerJoin('owner.companies', 'company')

        .where('ticket.id = :ticketId', { ticketId }) //! Por ID
        .andWhere('ticket.buyerId = :buyerId', {
          buyerId: customer.id, //! la misma persona
        })
        .andWhere('ticket.status IN (:...statuses)', {
          statuses: [TicketStatus.SOLD, TicketStatus.RESERVED], //! Solo los vendidos o reservados
        })
        .andWhere('ticket.type = :type', { type: TicketType.IN_APP }) //! Solo en app
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

      /* if (this.hasTravelDeparted(ticket.travel)) {
        throw new BadRequestException(
          'Cannot cancel a ticket for a travel that has already departed',
        );
      } */

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
        ticket: ticket,
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
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignPassenger(dto: AssignPassengerInAppDto, customer: Customer) {
    return this.ticketsService.assignPassengerBase(
      dto.ticketId,
      dto.seatId,
      dto.passengerId,
      customer,
    );
  }
}
