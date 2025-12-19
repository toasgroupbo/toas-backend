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

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(createBusDto: CreateBusDto, companyId: number) {
    try {
      const { busType, ...data } = createBusDto;

      // --------------------------------------------
      // 1. Determina si un bus tiene o no decks
      // --------------------------------------------

      let decks: boolean = false;
      if (busType.decks.length > 1) {
        decks = true;
      }

      // --------------------------------------------
      // 2. Se crea el Bus
      // --------------------------------------------

      const newBus = this.busRepository.create({
        ...data,
        owner: { id: createBusDto.ownerId },
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

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const bus = await this.busRepository.findOne({
      where: {
        id,
        company: { id: companyId },
      },
      relations: { owner: true, busType: true },
    });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, updateBusDto: UpdateBusDto, companyId: number) {
    const bus = await this.findOne(id, companyId);
    try {
      Object.assign(bus, updateBusDto);
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
