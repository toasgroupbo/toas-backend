import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { TravelInAppFilterDto } from './pagination/travel-in-app-pagination.dto';

import { TravelStatus } from './enums/travel-status.enum';

import { Travel } from './entities/travel.entity';
import { RoutesInAppService } from '../routes/routes-in-app.service';

@Injectable()
export class TravelsInAppService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    private readonly routesInAppService: RoutesInAppService,
  ) {}

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findAll(filters: TravelInAppFilterDto) {
    const { destination_placeId, origin_placeId, departure_time } = filters;

    const where: any = {
      route: {
        officeOrigin: { place: { id: origin_placeId } },
        officeDestination: { place: { id: destination_placeId } },
      },
    };
    // --------------------------------------------
    // 1. Filtros
    // --------------------------------------------

    //! Por dia
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

    return travels;
  }

  //? ============================================================================================== */
  //?                                       FindOne                                                  */
  //? ============================================================================================== */

  async findOne(id: number) {
    return await this.travelRepository.findOne({
      where: { id },

      relations: {
        bus: true,
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
          sale_type: true,
          status: true,
          //createdAt: true,
          //passenger: false,
        },
      },
    });
  }
}
