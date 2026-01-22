import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { TravelForCashierFilterDto } from './pagination';

import { SeatStatus } from 'src/common/enums';
import { SaleType } from './enums/sale_type-enum';
import { TravelStatus } from './enums/travel-status.enum';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';

import { TicketExpirationService } from '../tickets/services/ticket-expiration.service';

import { Travel } from './entities/travel.entity';
import { User } from '../users/entities/user.entity';
import { TravelSeat } from './entities/travel-seat.entity';
import { Office } from '../offices/entities/office.entity';

@Injectable()
export class TravelsForCashierService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    @InjectRepository(TravelSeat)
    private readonly travelSeatRepository: Repository<TravelSeat>,

    private readonly ticketExpirationService: TicketExpirationService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(filters: TravelForCashierFilterDto, office: Office) {
    const { destination_placeId } = filters;
    const origin_placeId = office.place.id;

    const where: any = {
      route: {
        officeOrigin: { place: { id: origin_placeId } },
        officeDestination: { place: { id: destination_placeId } },
      },
    };

    // --------------------------------------------
    // 2. Paginación y relaciones
    // --------------------------------------------

    const travels = await this.travelRepository.find({
      where: { ...where, travel_status: TravelStatus.ACTIVE },
      order: { departure_time: 'ASC' },
      relations: {
        //bus: true,
        route: {
          officeOrigin: { place: true },
          officeDestination: { place: true },
        },
      },
    });

    return travels;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(travelId: number, office: Office) {
    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    await this.ticketExpirationService.expireTravelIfNeeded(travelId);

    const travel = await this.travelRepository.findOne({
      where: { id: travelId, route: { officeOrigin: { id: office.id } } },
      relations: {
        bus: true,
        route: { officeOrigin: true, officeDestination: true },
        travelSeats: true,
      },
    });
    if (!travel) throw new NotFoundException('Travel not found');
    return travel;
  }

  //? ============================================================================================== */
  //?                           Get_Seats_Available                                                  */
  //? ============================================================================================== */

  async getSeatsAvailable(travelId: number) {
    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    await this.ticketExpirationService.expireTravelIfNeeded(travelId);

    return await this.travelSeatRepository
      .createQueryBuilder('seat')
      .where('seat.travelId = :travelId', { travelId })
      .andWhere(`seat.status = :available OR seat.status = :reserved`, {
        available: SeatStatus.AVAILABLE,
        reserved: SeatStatus.RESERVED,
      })
      .getMany();
  }

  //? ============================================================================================== */
  //?                                        Closed                                                  */
  //? ============================================================================================== */

  async close(travelId: number, cashier: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //! Bloquear viaje
      const travel = await queryRunner.manager
        .createQueryBuilder(Travel, 'travel')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('travel.tickets', 'ticket')
        .leftJoinAndSelect('ticket.travelSeats', 'ticketSeats')
        .leftJoinAndSelect('travel.travelSeats', 'travelSeats')
        .where('travel.id = :id', { id: travelId })
        .andWhere('travel.travel_status = :status', {
          status: TravelStatus.ACTIVE,
        })
        .getOne();

      if (!travel) {
        throw new NotFoundException('Active travel not found');
      }

      //! Cerrar viaje
      travel.travel_status = TravelStatus.CLOSED;
      travel.closedAt = new Date();
      travel.closedBy = cashier;

      const now = new Date();

      //! Procesar tickets
      for (const ticket of travel.tickets) {
        if (ticket.status === TicketStatus.RESERVED) {
          if (ticket.reserve_expiresAt && ticket.reserve_expiresAt < now) {
            ticket.status = TicketStatus.EXPIRED;
          } else {
            ticket.status = TicketStatus.CANCELLED_FOR_CLOSE;
          }
          ticket.reserve_expiresAt = null;
        }
      }

      //! Procesar asientos
      for (const seat of travel.travelSeats) {
        if (seat.status !== SeatStatus.SOLD) {
          seat.status = SeatStatus.UNSOLD;
          seat.sale_type = SaleType.UNSOLD;
          seat.price = '0';
          seat.ticket = null;
        }
      }

      //! Persistir
      await queryRunner.manager.save(travel);
      await queryRunner.manager.save(travel.tickets);
      await queryRunner.manager.save(travel.travelSeats);

      await queryRunner.commitTransaction();

      return {
        message: 'Travel closed successfully',
        travel: travel,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }
}
