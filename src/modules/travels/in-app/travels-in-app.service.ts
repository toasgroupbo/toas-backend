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
        company: true,
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
  //?                           FindAllFindNextWeek                                                  */
  //? ============================================================================================== */

  async findNextWeek(filters: TravelInAppFilterDto) {
    const { destination_placeId, origin_placeId, departure_time } = filters;

    const where: any = {
      enabled: true,
      travel_status: TravelStatus.ACTIVE,
      route: {
        officeOrigin: { place: { id: origin_placeId } },
        officeDestination: { place: { id: destination_placeId } },
      },
    };

    // --------------------------------------------
    // RANGO: desde fecha enviada hasta +7 días
    // --------------------------------------------
    let start = new Date();

    if (departure_time) {
      start = new Date(`${departure_time}T00:00:00-04:00`);
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    where.departure_time = Between(start, end);

    const travels = await this.travelRepository.find({
      where,
      relations: {
        company: true,
        bus: { busType: true, company: true },
        route: {
          officeOrigin: { place: true },
          officeDestination: { place: true },
        },
      },
      order: {
        departure_time: 'ASC',
      },
    });

    // --------------------------------------------
    // FILTRO DE CIERRE
    // --------------------------------------------
    const now = new Date();

    return travels
      .filter((travel) => {
        const hours = travel.company.hours_before_closing;

        const closingTime = new Date(travel.departure_time);
        closingTime.setHours(closingTime.getHours() - hours);

        return now < closingTime;
      })
      .map((travel) => ({
        date: travel.departure_time,
        price_deck_1: travel.price_deck_1,
      }));
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
