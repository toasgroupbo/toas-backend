import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateBusDto, UpdateBusDto } from './dto';

import { Bus } from './entities/bus.entity';
import { BusType } from './entities/bus-type.entity';
import { Travel } from '../travels/entities/travel.entity';

@Injectable()
export class BusesService {
  constructor(
    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(dto: CreateBusDto, companyId: number) {
    try {
      const { busType, ...data } = dto;

      //! Determina si un bus tiene o no decks
      let decks: boolean = false;
      if (busType.decks.length > 1) {
        decks = true;
      }

      const newBus = this.busRepository.create({
        ...data,
        owner: { id: dto.ownerId },
        busType,
        decks,
        company: { id: companyId },
      });
      return await this.busRepository.save(newBus);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number) {
    const buses = await this.busRepository.find({
      where: {
        company: { id: companyId },
        enabled: true,
      },
      relations: { owner: true, busType: true },
    });
    return buses;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const bus = await this.busRepository.findOne({
      where: {
        id,
        company: { id: companyId },
        enabled: true,
      },
      relations: { owner: true, busType: true },
    });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateBusDto, companyId: number) {
    const bus = await this.findOne(id, companyId);
    try {
      Object.assign(bus, dto);
      return await this.busRepository.save(bus);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number, companyId: number) {
    const bus = await this.findOne(id, companyId);
    try {
      await this.dataSource.transaction(async (manager) => {
        //! Deshabilitar viajes asociados
        await manager.update(
          Travel,
          {
            bus: { id: bus.id },
            enabled: true,
          },
          {
            enabled: false,
          },
        );

        //! Deshabilitar busType
        if (bus.busType) {
          await manager.update(
            BusType,
            {
              id: bus.busType.id,
            },
            {
              enabled: false,
            },
          );
        }

        //! Deshabilitar bus
        await manager.update(Bus, { id: bus.id }, { enabled: false });
      });

      return {
        message: 'Bus Disabled',
        disabled: bus,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
