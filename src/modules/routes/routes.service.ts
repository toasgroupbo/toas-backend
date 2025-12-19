import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateRouteDto, UpdateRouteDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Route } from './entities/route.entity';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createRouteDto: CreateRouteDto) {
    try {
      const { officeOriginId, officeDestinationId } = createRouteDto;

      //! Validar que las oficinas de origen y destino sean diferentes
      if (officeOriginId == officeDestinationId)
        throw new ConflictException(
          'The origin and destination offices must be different',
        );

      const newRoute = this.routeRepository.create({
        ...createRouteDto,
        officeOrigin: { id: officeOriginId },
        officeDestination: { id: officeDestinationId },
      });
      return await this.routeRepository.save(newRoute);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(companyId: number) {
    const routes = await this.routeRepository.find({
      where: { officeOrigin: { company: { id: companyId } } },
      relations: {
        officeOrigin: true,
        officeDestination: true,
      },
    });
    return routes;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: number, companyId: number) {
    const Route = await this.routeRepository.findOne({
      where: { id, officeOrigin: { company: { id: companyId } } },
      relations: {
        officeOrigin: true,
        officeDestination: true,
      },
    });
    if (!Route) throw new NotFoundException('Route not found');
    return Route;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: number, updateRouteDto: UpdateRouteDto, companyId: number) {
    const route = await this.findOne(id, companyId);
    try {
      Object.assign(route, updateRouteDto);
      return await this.routeRepository.save(route);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: number, companyId: number) {
    const route = await this.findOne(id, companyId);
    try {
      await this.routeRepository.softRemove(route);
      return {
        message: 'Route deleted successfully',
        deleted: route,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
