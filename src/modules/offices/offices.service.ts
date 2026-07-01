import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateOfficeDto, UpdateOfficeDto } from './dto';

import { Office } from './entities/office.entity';
import { Route } from '../routes/entities/route.entity';
import { Travel } from '../travels/entities/travel.entity';
import { TravelStatus } from '../travels/enums';

@Injectable()
export class OfficesService {
  constructor(
    @InjectRepository(Office)
    private readonly officeRepository: Repository<Office>,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(dto: CreateOfficeDto, companyId: number) {
    try {
      const newOffice = this.officeRepository.create({
        ...dto,
        company: { id: companyId },
        place: { id: dto.placeId },
      });
      return await this.officeRepository.save(newOffice);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number) {
    const offices = await this.officeRepository.find({
      where: { company: { id: companyId }, enabled: true },
      relations: { place: true },
    });
    return offices;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const office = await this.officeRepository.findOne({
      where: { id, company: { id: companyId }, enabled: true },
      relations: { place: true },
    });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateOfficeDto, companyId: number) {
    const office = await this.findOne(id, companyId);
    try {
      Object.assign(office, dto);
      return await this.officeRepository.save(office);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number, companyId: number) {
    const office = await this.officeRepository.findOne({
      where: { id, company: { id: companyId }, enabled: true },
      relations: {
        cashiers: true,
        origenRoutes: true,
        destinationRoutes: true,
      },
    });

    if (!office) throw new NotFoundException();

    const hasEnabledCashiers = office.cashiers?.some((c) => c.enabled);

    if (hasEnabledCashiers) {
      throw new BadRequestException(
        'No se puede deshabilitar la oficina porque tiene cajeros habilitados',
      );
    }

    //! Obtener IDs de rutas
    const routeIds = [
      ...(office.origenRoutes?.map((r) => r.id) || []),
      ...(office.destinationRoutes?.map((r) => r.id) || []),
    ];

    const uniqueRouteIds = [...new Set(routeIds)];

    if (uniqueRouteIds.length) {
      const hasActiveTravel = await this.dataSource.manager.exists(Travel, {
        where: {
          route: { id: In(uniqueRouteIds) },
          enabled: true,
          travel_status: Not(TravelStatus.CLOSED),
        },
      });

      if (hasActiveTravel) {
        throw new ConflictException(
          'No se puede deshabilitar la oficina porque tiene rutas con salidas activas',
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      //! Deshabilitar rutas
      if (uniqueRouteIds.length) {
        await manager.update(
          Route,
          { id: In(uniqueRouteIds) },
          { enabled: false },
        );
      }

      //! Deshabilitar office
      await manager.update(Office, { id: office.id }, { enabled: false });
    });

    return { message: 'Office disabled', office };
  }
}
