import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateRouteDto, UpdateRouteDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { User } from '../users/entities/user.entity';
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
      const { officeOriginUUID, officeDestinationUUID } = createRouteDto;

      //! Validar que las oficinas de origen y destino sean diferentes
      if (officeOriginUUID == officeDestinationUUID)
        throw new ConflictException(
          'The origin and destination offices must be different',
        );

      const newRoute = this.routeRepository.create({
        ...createRouteDto,
        officeOrigin: { id: officeOriginUUID },
        officeDestination: { id: officeDestinationUUID },
      });
      return await this.routeRepository.save(newRoute);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(user: User) {
    const routes = await this.routeRepository.find({
      where: { officeOrigin: { company: user.company } },
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

  async findOne(id: string, user: User) {
    const Route = await this.routeRepository.findOne({
      where: { id, officeOrigin: { company: user.company } },
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

  async update(id: string, updateRouteDto: UpdateRouteDto, user: User) {
    const route = await this.findOne(id, user);
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

  async remove(id: string, user: User) {
    const route = await this.findOne(id, user);
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
