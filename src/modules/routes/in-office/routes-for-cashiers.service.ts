import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Route } from '../entities/route.entity';
import { Office } from 'src/modules/offices/entities/office.entity';

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
        enabled: true,
        officeOrigin: { id: office.id },
      },
    });
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findAllForOwner(companyId: number) {
    return await this.routeRepository.find({
      where: {
        enabled: true,
        officeOrigin: { company: { id: companyId } },
      },
    });
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findOne(id: number) {
    const Route = await this.routeRepository.findOne({
      where: { id, enabled: true },
      relations: {
        officeOrigin: true,
        officeDestination: true,
      },
    });
    if (!Route) throw new NotFoundException('Route not found');
    return Route;
  }
}
