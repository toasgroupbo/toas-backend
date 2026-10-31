import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Not, Repository } from 'typeorm';

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

    await this.validatePlaqueAvailable(dto.plaque, companyId);

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

    //! solo si cambia de verdad: un bus ya duplicado se puede seguir editando si el form reenvía su placa
    if (
      dto.plaque &&
      this.normalizePlaque(dto.plaque) !== this.normalizePlaque(bus.plaque)
    ) {
      await this.validatePlaqueAvailable(dto.plaque, companyId);
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
      where: [
        //! un viaje cancelado ya liberó asientos y devolvió saldos: no retiene al bus
        {
          bus: { id: bus.id },
          travel_status: Not(
            In([
              TravelStatus.CLOSED,
              TravelStatus.REJECTED,
              TravelStatus.CANCELLED,
            ]),
          ),
        },
        //! cerrado no significa que llegó: el bus sigue en ruta hasta su arrival_time
        {
          bus: { id: bus.id },
          travel_status: TravelStatus.CLOSED,
          arrival_time: MoreThan(new Date()),
        },
      ],
    });

    if (hasOpenTravels) {
      throw new BadRequestException(
        'No se puede eliminar el bus porque tiene salidas sin cerrar o en curso',
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

  //* ============================================================================================== */

  //! misma regla en JS y en SQL: sin guiones ni espacios y en mayúsculas
  private normalizePlaque(plaque: string) {
    return plaque.replace(/[-\s]/g, '').toUpperCase();
  }

  //! ABC-1234 y abc 1234 son el mismo bus físico: si no, el chequeo de viajes solapados por bus.id no lo detecta
  private async validatePlaqueAvailable(plaque: string, companyId: number) {
    const plaqueInUse = await this.busRepository
      .createQueryBuilder('bus')
      .where(`UPPER(REGEXP_REPLACE(bus.plaque, '[-\\s]', '', 'g')) = :plaque`, {
        plaque: this.normalizePlaque(plaque),
      })
      .andWhere('bus.enabled = true')
      .andWhere('bus.companyId = :companyId', { companyId })
      .getExists();

    if (plaqueInUse) {
      throw new ConflictException('Ya existe un bus activo con estas placas');
    }
  }
}
