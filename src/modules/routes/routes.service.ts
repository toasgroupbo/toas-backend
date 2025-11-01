import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateRouteDto, UpdateRouteDto } from './dto';

import { Route } from './entities/route.entity';
import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

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

  async findAll(pagination: PaginationDto) {
    //const { limit = 10, offset = 0 } = pagination;
    const routes = await this.routeRepository.find({
      //take: limit,
      //skip: offset,
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

  async findOne(id: string) {
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

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateRouteDto: UpdateRouteDto) {
    const route = await this.findOne(id);
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

  async remove(id: string) {
    const route = await this.findOne(id);
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
