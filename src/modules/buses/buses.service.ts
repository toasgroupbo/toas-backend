import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateBusDto, UpdateBusDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Bus } from './entities/bus.entity';
import { Office } from '../offices/entities/office.entity';

@Injectable()
export class BusesService {
  constructor(
    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createBusDto: CreateBusDto, companyUUID: string) {
    try {
      const { busType, ...data } = createBusDto;

      // --------------------------------------------------------------------------
      // 1. Determina si un bus tiene o no decks
      // --------------------------------------------------------------------------

      let decks: boolean = false;
      if (busType.decks.length > 1) {
        decks = true;
      }

      // --------------------------------------------------------------------------
      // 2. Se crea el Bus
      // --------------------------------------------------------------------------

      const newBus = this.busRepository.create({
        ...data,
        owner: { id: createBusDto.ownerUUID },
        busType,
        decks,
        company: { id: companyUUID },
      });
      return await this.busRepository.save(newBus);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(companyUUID: string) {
    const buses = await this.busRepository.find({
      where: {
        company: { id: companyUUID },
      },
      relations: { owner: true, busType: true },
    });
    return buses;
  }

  async findAllforCashier(office: Office) {
    const company = office.company;

    const buses = await this.busRepository.find({
      where: {
        company: { id: company.id },
      },
      relations: { owner: true, busType: true },
    });
    return buses;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string, companyUUID: string) {
    const bus = await this.busRepository.findOne({
      where: {
        id,
        company: { id: companyUUID },
      },
      relations: { owner: true, busType: true },
    });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateBusDto: UpdateBusDto, companyUUID: string) {
    const bus = await this.findOne(id, companyUUID);
    try {
      Object.assign(bus, updateBusDto);
      return await this.busRepository.save(bus);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: string, companyUUID: string) {
    const bus = await this.findOne(id, companyUUID);
    try {
      await this.busRepository.softRemove(bus);
      return {
        message: 'Bus deleted successfully',
        deleted: bus,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
