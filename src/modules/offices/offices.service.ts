import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateOfficeDto, UpdateOfficeDto } from './dto';

import { Office } from './entities/office.entity';
import { Travel } from '../travels/entities/travel.entity';

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
      where: { company: { id: companyId } },
      relations: { place: true },
    });
    return offices;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const office = await this.officeRepository.findOne({
      where: { id, company: { id: companyId } },
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
      where: { id, company: { id: companyId } },
      relations: {
        cashiers: true,
        origenRoutes: true,
        destinationRoutes: true,
      },
    });

    if (!office) throw new NotFoundException();

    await this.dataSource.transaction(async (manager) => {
      // 1. Obtener IDs de rutas
      const routeIds = [
        ...(office.origenRoutes?.map((r) => r.id) || []),
        ...(office.destinationRoutes?.map((r) => r.id) || []),
      ];

      // 2. Deshabilitar travels de esas rutas
      if (routeIds.length) {
        await manager.update(
          Travel,
          {
            route: { id: In(routeIds) },
            enabled: true,
          },
          { enabled: false },
        );
      }

      // 3. Eliminar cashiers
      if (office.cashiers?.length) {
        await manager.softRemove(office.cashiers);
      }

      // 4. Eliminar rutas
      const allRoutes = [
        ...(office.origenRoutes || []),
        ...(office.destinationRoutes || []),
      ];

      if (allRoutes.length) {
        await manager.softRemove(allRoutes);
      }

      // 5. Eliminar office
      await manager.softRemove(office);
    });

    return { message: 'Office deleted', office };
  }
}
