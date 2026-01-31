import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Route } from './entities/route.entity';
import { Office } from '../offices/entities/office.entity';

@Injectable()
export class RoutesForCashierService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findAll(office: Office) {
    return await this.routeRepository.find({
      where: {
        officeOrigin: { id: office.id },
      },
    });
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findOne(id: number) {
    const Route = await this.routeRepository.findOne({
      where: { id },
      relations: {
        officeOrigin: true,
        officeDestination: true,
      },
    });
    if (!Route) throw new NotFoundException('Route not found');
    return Route;
  }
}
