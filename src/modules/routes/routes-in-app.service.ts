import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Route } from './entities/route.entity';

@Injectable()
export class RoutesInAppService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findAll() {
    return await this.routeRepository.find({});
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
