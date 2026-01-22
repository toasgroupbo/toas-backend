import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { paginate } from 'src/common/pagination/paginate';
import { CreateTravelDto } from './dto';
import { TravelPaginationDto } from './pagination/travel-pagination.dto';

import { SeatStatus } from 'src/common/enums';
import { TravelStatus } from './enums/travel-status.enum';

import { TicketExpirationService } from '../tickets/services/ticket-expiration.service';

import { Travel } from './entities/travel.entity';
import { Bus } from '../buses/entities/bus.entity';

@Injectable()
export class TravelsService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    private readonly ticketExpirationService: TicketExpirationService,

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
      const now = new Date();

      // --------------------------------------------
      // 1. Obtener el Bus con tipo y su layout
      // --------------------------------------------

      const bus = await queryRunner.manager.findOne(Bus, {
        where: { id: busId },
        relations: { busType: true },
      });

      if (!bus) throw new NotFoundException('Bus not found');

      // --------------------------------------------
      // 2. Validar que bus no este en un travel activo
      // --------------------------------------------

      const activeTravel = await queryRunner.manager.findOne(Travel, {
        where: {
          bus: { id: bus.id },
          travel_status: TravelStatus.ACTIVE,
          arrival_time: MoreThan(now),
        },
      });

      if (activeTravel)
        throw new ConflictException(
          'The bus is already assigned to an active travel',
        );

      // --------------------------------------------
      // 3. Generar seats segun maquetacion
      // --------------------------------------------

      const travelSeats = bus.busType.decks.flatMap((deck) =>
        deck.seats.map((seat) => ({
          ...seat,
          deck: deck.deck,
          deckType: deck.deckType,
        })),
      );

      // --------------------------------------------
      // 4. Creacion del Travel
      // --------------------------------------------

      const newTravel = queryRunner.manager.create(Travel, {
        ...data,
        route: { id: routeId },
        bus: bus,
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
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(pagination: TravelPaginationDto, companyId: number) {
    const { status } = pagination;

    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    const travelsToExpire = await this.travelRepository.find({
      select: { id: true },
    });

    for (const travel of travelsToExpire) {
      await this.ticketExpirationService.expireTravelIfNeeded(travel.id);
    }

    const options: any = {
      where: { bus: { company: { id: companyId } } },
    };

    //! filtrar por status
    if (status) {
      options.where.travel_status = status;
    }

    const travels = await paginate(
      this.travelRepository,
      {
        ...options,
        order: { id: 'DESC' },
        relations: {
          bus: true,
          route: { officeOrigin: true, officeDestination: true },
        },
      },
      pagination,
    );
    return travels;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    await this.ticketExpirationService.expireTravelIfNeeded(id);

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
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  async cancel(id: number, companyId: number) {
    //! --------------------------------------------
    //! Expirar Reservas si es necesario
    //! --------------------------------------------

    await this.ticketExpirationService.expireTravelIfNeeded(id);

    const travel = await this.findOne(id, companyId);

    try {
      travel.travel_status = TravelStatus.CANCELLED;

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
