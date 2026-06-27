import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateBusDto, UpdateBusDto } from './dto';

import { Bus } from './entities/bus.entity';
import { BusType } from './entities/bus-type.entity';
import { Owner } from '../owners/entities/owner.entity';
import { Travel } from '../travels/entities/travel.entity';
import { TravelStatus } from '../travels/enums';

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
    const owner = await this.dataSource.manager.findOne(Owner, {
      where: {
        id: dto.ownerId,
        enabled: true,
        companyOwner: { company: { id: companyId }, enabled: true },
      },
    });
    if (!owner) throw new NotFoundException('Owner not found or disabled');

    const plaqueInUse = await this.busRepository.exists({
      where: { plaque: dto.plaque, enabled: true, company: { id: companyId } },
    });

    if (plaqueInUse) {
      throw new ConflictException('Ya existe un bus activo con estas placas');
    }

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
      relations: { owner: true, busType: true, company: true },
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
      relations: { owner: true, busType: true, company: true },
    });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateBusDto, companyId: number) {
    const bus = await this.findOne(id, companyId);

    if (dto.ownerId) {
      const owner = await this.dataSource.manager.findOne(Owner, {
        where: {
          id: dto.ownerId,
          enabled: true,
          companyOwner: { company: { id: companyId }, enabled: true },
        },
      });
      if (!owner) throw new NotFoundException('Owner not found or disabled');
    }

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

    const hasOpenTravels = await this.dataSource.manager.exists(Travel, {
      where: {
        bus: { id: bus.id },
        enabled: true,
        travel_status: Not(TravelStatus.CLOSED),
      },
    });

    if (hasOpenTravels) {
      throw new BadRequestException(
        'No se puede eliminar el bus porque tiene salidas sin cerrar',
      );
    }

    try {
      await this.dataSource.transaction(async (manager) => {
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
