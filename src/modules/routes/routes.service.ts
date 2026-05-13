import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateRouteDto, UpdateRouteDto } from './dto';

import { Route } from './entities/route.entity';
import { Travel } from '../travels/entities/travel.entity';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(dto: CreateRouteDto) {
    try {
      const { officeOriginId, officeDestinationId } = dto;

      if (officeOriginId == officeDestinationId)
        throw new ConflictException(
          'The origin and destination offices must be different',
        );

      const newRoute = this.routeRepository.create({
        ...dto,
        officeOrigin: { id: officeOriginId },
        officeDestination: { id: officeDestinationId },
      });
      return await this.routeRepository.save(newRoute);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number) {
    const routes = await this.routeRepository.find({
      order: { id: 'DESC' },
      where: {
        officeOrigin: { company: { id: companyId } },
        enabled: true,
      },
      relations: {
        officeOrigin: true,
        officeDestination: true,
      },
    });
    return routes;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const route = await this.routeRepository.findOne({
      where: {
        id,
        officeOrigin: { company: { id: companyId } },
        enabled: true,
      },
      relations: {
        officeOrigin: true,
        officeDestination: true,
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateRouteDto, companyId: number) {
    const route = await this.findOne(id, companyId);
    try {
      Object.assign(route, dto);
      return await this.routeRepository.save(route);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number, companyId: number) {
    const route = await this.findOne(id, companyId);

    await this.dataSource.transaction(async (manager) => {
      //! Deshabilitar travels
      await manager.update(
        Travel,
        {
          route: { id: route.id },
          enabled: true,
        },
        { enabled: false },
      );

      //! Deshabilitar route
      await manager.update(Route, { id: route.id }, { enabled: false });
    });

    return { message: 'Route Disabled', disabled: route };
  }
}
