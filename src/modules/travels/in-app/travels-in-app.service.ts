import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';

import { TravelStatus } from '../enums/travel-status.enum';

import { TravelInAppFilterDto } from '../pagination';

import { TicketExpirationService } from '../../tickets/ticket-expiration.service';

import { Travel } from '../entities/travel.entity';

@Injectable()
export class TravelsInAppService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    private readonly ticketExpirationService: TicketExpirationService,

    private readonly dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  /* async findAll(filters: TravelInAppFilterDto) {
    const { destination_placeId, origin_placeId, departure_time } = filters;

    // --------------------------------------------
    //  Helper para construir la query
    // --------------------------------------------
    const buildQuery = (start?: Date, end?: Date) => {
      const query = this.travelRepository
        .createQueryBuilder('travel')
        .leftJoinAndSelect('travel.bus', 'bus')
        .leftJoinAndSelect('bus.busType', 'busType')
        .leftJoinAndSelect('bus.company', 'company')
        .leftJoinAndSelect('travel.route', 'route')
        .leftJoinAndSelect('route.officeOrigin', 'officeOrigin')
        .leftJoinAndSelect('officeOrigin.place', 'originPlace')
        .leftJoinAndSelect('route.officeDestination', 'officeDestination')
        .leftJoinAndSelect('officeDestination.place', 'destinationPlace')
        .where('travel.enabled = true')
        .andWhere('travel.travel_status = :status', {
          status: TravelStatus.ACTIVE,
        })
        .andWhere('originPlace.id = :origin', {
          origin: origin_placeId,
        })
        .andWhere('destinationPlace.id = :destination', {
          destination: destination_placeId,
        })
        //  Filtro clave (horas antes del cierre)
        .andWhere(
          `travel.departure_time > NOW() + (COALESCE(company.hours_before_closing, 0) * INTERVAL '1 hour')`,
        )
        //  Ordenar por el más próximo
        .orderBy('travel.departure_time', 'ASC');

      if (start && end) {
        query.andWhere('travel.departure_time BETWEEN :start AND :end', {
          start,
          end,
        });
      }

      return query;
    };

    let travels: Travel[] = [];

    // --------------------------------------------
    //  1. Si hay filtro por fecha
    // --------------------------------------------
    if (departure_time) {
      const start = new Date(`${departure_time}T00:00:00-04:00`);
      const end = new Date(`${departure_time}T23:59:59.999-04:00`);

      //  búsqueda inicial (solo ese día)
      travels = await buildQuery(start, end).getMany();

      // --------------------------------------------
      // 2. Fallback → buscar 7 días adelante
      // --------------------------------------------
      if (travels.length === 0) {
        const nextWeekEnd = new Date(end);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

        travels = await buildQuery(start, nextWeekEnd).getMany();
      }
    } else {
      // --------------------------------------------
      //  Sin fecha → comportamiento normal
      // --------------------------------------------
      travels = await buildQuery().getMany();
    }

    return travels;
  } */

  async findAll(filters: TravelInAppFilterDto) {
    const { destination_placeId, origin_placeId, departure_time } = filters;

    const where: any = {
      enabled: true,
      route: {
        officeOrigin: { place: { id: origin_placeId } },
        officeDestination: { place: { id: destination_placeId } },
      },
    };

    // --------------------------------------------
    // 1. Filtros
    // --------------------------------------------

    if (departure_time) {
      const start = new Date(`${departure_time}T00:00:00-04:00`);
      const end = new Date(`${departure_time}T23:59:59.999-04:00`);
      where.departure_time = Between(start, end);
    }

    // --------------------------------------------
    // 2. Paginación y relaciones
    // --------------------------------------------

    const travels = await this.travelRepository.find({
      where: { ...where, travel_status: TravelStatus.ACTIVE },
      relations: {
        bus: { busType: true, company: true },
        route: {
          officeOrigin: { place: true },
          officeDestination: { place: true },
        },
      },
    });

    //return travels;
    const now = new Date();

    return travels.filter((travel) => {
      const hours = travel.company.hours_before_closing;

      const closingTime = new Date(travel.departure_time);
      closingTime.setHours(closingTime.getHours() - hours);

      return now < closingTime;
    });
  }

  //? ============================================================================================== */
  //?                                       FindOne                                                  */
  //? ============================================================================================== */

  async findOne(travelId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.ticketExpirationService.expireTravelIfNeeded(
        travelId,
        queryRunner.manager,
      );

      const travel = await queryRunner.manager.findOne(Travel, {
        where: { id: travelId, enabled: true },
        relations: {
          bus: { busType: true, company: true },
          route: {
            officeOrigin: { place: true },
            officeDestination: { place: true },
          },
          travelSeats: true,
        },
        select: {
          travelSeats: {
            id: true,
            row: true,
            column: true,
            deck: true,
            price: true,
            seatNumber: true,
            type: true,
            status: true,
          },
        },
      });

      await queryRunner.commitTransaction();
      return travel;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
