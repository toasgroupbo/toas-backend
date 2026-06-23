import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateOfficeDto, UpdateOfficeDto } from './dto';

import { Office } from './entities/office.entity';
import { Route } from '../routes/entities/route.entity';
import { Travel } from '../travels/entities/travel.entity';
import { User } from '../users/entities/user.entity';

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

    await this.dataSource.transaction(async (manager) => {
      //! Obtener IDs de rutas
      const routeIds = [
        ...(office.origenRoutes?.map((r) => r.id) || []),
        ...(office.destinationRoutes?.map((r) => r.id) || []),
      ];

      const uniqueRouteIds = [...new Set(routeIds)];

      //! Deshabilitar travels
      if (uniqueRouteIds.length) {
        await manager.update(
          Travel,
          {
            route: { id: In(uniqueRouteIds) },
            enabled: true,
          },
          { enabled: false },
        );
      }

      //! Deshabilitar rutas
      if (uniqueRouteIds.length) {
        await manager.update(
          Route,
          { id: In(uniqueRouteIds) },
          { enabled: false },
        );
      }

      //! Deshabilitar cashiers
      if (office.cashiers?.length) {
        const cashierIds = office.cashiers.map((c) => c.id);
        await manager.update(User, { id: In(cashierIds) }, { enabled: false });
      }

      //! Deshabilitar office
      await manager.update(Office, { id: office.id }, { enabled: false });
    });

    return { message: 'Office disabled', office };
  }
}
