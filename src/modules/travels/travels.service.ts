import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateTravelDto } from './dto';

import { SeatStatus } from 'src/common/enums';
import { SaleType } from './enums/sale_type-enum';
import { TravelStatus } from './enums/travel-status.enum';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';

import { Travel } from './entities/travel.entity';
import { Bus } from '../buses/entities/bus.entity';
import { User } from '../users/entities/user.entity';
import { TravelSeat } from './entities/travel-seat.entity';
import { Office } from '../offices/entities/office.entity';

@Injectable()
export class TravelsService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    @InjectRepository(TravelSeat)
    private readonly travelSeatRepository: Repository<TravelSeat>,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(createTravelDto: CreateTravelDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { busId, routeId, ...data } = createTravelDto;

      // --------------------------------------------
      // 1. Obtener el Bus con tipo y su layout
      // --------------------------------------------

      const busEntity = await queryRunner.manager.findOne(Bus, {
        where: { id: busId },
        relations: { busType: true },
      });
      if (!busEntity) throw new NotFoundException('Bus not found');

      // --------------------------------------------
      // 2. Generar seats segun maquetacion
      // --------------------------------------------

      const travelSeats = busEntity.busType.decks.flatMap((deck) =>
        deck.seats.map((seat) => ({
          ...seat,
          deck: deck.deck,
          deckType: deck.deckType,
        })),
      );

      // --------------------------------------------
      // 3. Creacion del Travel
      // --------------------------------------------

      const newTravel = queryRunner.manager.create(Travel, {
        ...data,
        route: { id: routeId },
        bus: busEntity,
        travelSeats,
      });

      await queryRunner.manager.save(newTravel);
      await queryRunner.commitTransaction();
      return newTravel;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                           Get_Seats_Available                                                  */
  //? ============================================================================================== */

  async getSeatsAvailable(travelId: number) {
    return await this.travelSeatRepository
      .createQueryBuilder('seat')
      .where('seat.travelId = :travelId', { travelId })
      .andWhere(
        `
      seat.status = :available
      OR (seat.status = :reserved)
    `,
        {
          available: SeatStatus.AVAILABLE,
          reserved: SeatStatus.RESERVED,
        },
      )
      .getMany();
  }

  //? ============================================================================================== */
  //?                                 Closed_Travel                                                  */
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
        travelId: travel.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number) {
    const travels = await this.travelRepository.find({
      where: { bus: { company: { id: companyId } } },

      relations: {
        bus: true,
        route: { officeOrigin: true, officeDestination: true },
        travelSeats: true,
      },
    });
    return travels;
  }

  //? ============================================================================================== */

  async findAllForCashier(office: Office) {
    const officeId = office.id;

    const travels = await this.travelRepository.find({
      where: {
        route: { officeOrigin: { id: officeId } },
        travel_status: TravelStatus.ACTIVE, //! solo lista los viajes activos
      },
      relations: {
        bus: true,
        route: { officeOrigin: true, officeDestination: true },
      },
    });
    return travels;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const travel = await this.travelRepository.findOne({
      where: { id, bus: { company: { id: companyId } } },

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

  async findOneForCashier(travelId: number, office: Office) {
    const officeId = office.id;

    const travel = await this.travelRepository.findOne({
      where: { id: travelId, route: { officeOrigin: { id: officeId } } },
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
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  async cancel(id: number, companyId: number) {
    const travel = await this.findOne(id, companyId);

    try {
      travel.travel_status = TravelStatus.CANCELLED;
      /* travel.travelSeats.forEach((s) => {
        s.status = TravelStatus.CANCELLED; //! se cancela el asiento
        s.deletedAt = new Date(); //! se elimina el asiento
      }); */

      return await this.travelRepository.save(travel);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number, companyId: number) {
    const travel = await this.findOne(id, companyId);

    try {
      //! Verificar si algún asiento está en estado 'sold' o 'reserved'
      const hasSoldOrReserved = travel.travelSeats.some(
        (s) => s.status === SeatStatus.SOLD || s.status === SeatStatus.RESERVED,
      );
      if (hasSoldOrReserved) {
        throw new ConflictException(
          'Cannot cancel travel because some seats are sold or reserved',
        );
      }

      await this.travelRepository.softRemove(travel);
      return {
        message: 'Travel deleted successfully',
        deleted: travel,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
