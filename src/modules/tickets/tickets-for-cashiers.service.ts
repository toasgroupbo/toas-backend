import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateTicketInOfficeDto, AssignPassengerInOfficeDto } from './dto';

import { SeatStatus } from 'src/common/enums';
import { TicketType } from './enums/ticket-type.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { SaleType } from '../travels/enums/sale_type-enum';

import { Ticket } from './entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Customer } from '../customers/entities/customer.entity';

import { TicketsService } from './tickets.service';
import { TicketExpirationService } from './services/ticket-expiration.service';

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
    });
  }

  //? ============================================================================================== */
  //?                                      Confirm                                                   */
  //? ============================================================================================== */

  async confirm(ticketId: number, cashier: User) {
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
        ticket: ticket,
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

  async generateQr() {}

  //? ============================================================================================== */
  //?                                     Confirm_QR                                                 */
  //? ============================================================================================== */

  async confirmTicketQr() {}

  //? ============================================================================================== */
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  async cancel(ticketId: number, cashier: User) {
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
        ticketId: ticket,
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

  async findAll(travelId: number, cashier: User) {
    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    await this.ticketExpirationService.expireTravelIfNeeded(travelId);

    const tickets = await this.ticketRepository.find({
      where: {
        travel: { id: travelId },
        soldBy: { id: cashier.id },
      },
      relations: { travelSeats: true, buyer: true },
    });
    return tickets;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  /* async findOne(id: number, admin: User) {
      const ticket = await this.ticketRepository.findOneBy({
        id,
        travel: {
          bus: { owner: { companies: admin.company } },
        },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');
      return ticket;
    } */

  //? ============================================================================================== */
  //?                               Assign_Passenger                                                 */
  //? ============================================================================================== */

  async assignPassenger(dto: AssignPassengerInOfficeDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return this.ticketsService.assignPassengerBase(
      dto.ticketId,
      dto.seatId,
      dto.passengerId,
      customer,
    );
  }
}
