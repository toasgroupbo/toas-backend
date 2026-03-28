import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, MoreThan, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { TravelStatus } from './enums';
import { SeatStatus } from 'src/common/enums';

import { CreateTravelDto } from './dto';
import { paginate } from 'src/common/pagination/paginate';
import { TravelPaginationDto } from './pagination/travel-pagination.dto';

import { TicketExpirationService } from '../tickets/ticket-expiration.service';

import { Travel } from './entities/travel.entity';
import { Bus } from '../buses/entities/bus.entity';
import { Office } from '../offices/entities/office.entity';

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

  async create(createTravelDto: CreateTravelDto /* office: Office */) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { busId, routeId, ...data } = createTravelDto;

      // --------------------------------------------
      // 1. Obtener el Bus con tipo y su layout
      // --------------------------------------------

      const bus = await queryRunner.manager.findOne(Bus, {
        where: { id: busId },
        relations: { busType: true },
      });

      if (!bus) throw new NotFoundException('Bus not found');

      // --------------------------------------------
      // 2. Validar que bus no tenga viajes solapados
      // --------------------------------------------

      const { departure_time, arrival_time } = data;

      const overlappingTravel = await queryRunner.manager.findOne(Travel, {
        where: {
          bus: { id: bus.id },
          travel_status: TravelStatus.ACTIVE,
          departure_time: LessThan(arrival_time),
          arrival_time: MoreThan(departure_time),
        },
      });

      if (overlappingTravel) {
        throw new ConflictException(
          'The bus already has a travel scheduled that overlaps with the selected departure or arrival time',
        );
      }
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
    return await this.dataSource.transaction(async (manager) => {
      const { status } = pagination;

      const travelsToExpire = await manager.find(Travel, {
        select: { id: true },
      });

      for (const travel of travelsToExpire) {
        await this.ticketExpirationService.expireTravelIfNeeded(
          travel.id,
          manager,
        );
      }

      const options: any = {
        where: { bus: { company: { id: companyId } } },
      };

      if (status) {
        options.where.travel_status = status;
      }

      const travels = await paginate(
        manager.getRepository(Travel),
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
    });
  }

  /* async findAll(pagination: TravelPaginationDto, companyId: number) {
    const { status } = pagination;

    const travelsToExpire = await this.travelRepository.find({
      select: { id: true },
    });

    for (const travel of travelsToExpire) {
      await this.ticketExpirationService.expireTravelIfNeeded(travel.id);
    }

    const options: any = {
      where: { bus: { company: { id: companyId } } },
    };

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
  } */

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(id, manager);

      const travel = await manager.findOne(Travel, {
        where: { id, bus: { company: { id: companyId } } },
        relations: {
          bus: true,
          route: { officeOrigin: true, officeDestination: true },
          travelSeats: true,
        },
      });

      if (!travel) throw new NotFoundException('Travel not found');

      return travel;
    });
  }
  /* async findOne(id: number, companyId: number) {
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
  } */

  //? ============================================================================================== */
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  async cancel(id: number, office: Office) {
    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(id, manager);

      const travel = await manager.findOne(Travel, {
        where: {
          id,
          route: { officeOrigin: { company: { id: office.company.id } } },
        },
      });

      if (!travel) throw new NotFoundException('Travel not found');

      if (travel.travel_status != TravelStatus.ACTIVE)
        throw new NotFoundException('The Travel is not active');

      try {
        travel.travel_status = TravelStatus.CANCELLED;

        return await manager.save(travel);
      } catch (error) {
        handleDBExceptions(error);
      }
    });
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  /* async remove(id: number, office: Office) {
    const travel = await this.findOne(id, office.company.id);

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
  } */
}
