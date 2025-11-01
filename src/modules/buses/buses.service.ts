import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateBusDto, UpdateBusDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Bus } from './entities/bus.entity';

@Injectable()
export class BusesService {
  constructor(
    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createBusDto: CreateBusDto) {
    try {
      const { busType, ...data } = createBusDto;

      const newBus = this.busRepository.create({
        ...data,
        owner: { id: createBusDto.owner },
        busType,
      });
      return await this.busRepository.save(newBus);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(pagination: PaginationDto) {
    //const { limit = 10, offset = 0 } = pagination;
    const buses = await this.busRepository.find({
      relations: { owner: true, busType: true },
      //take: limit,
      //skip: offset,
    });
    return buses;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string) {
    const bus = await this.busRepository.findOneBy({ id });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateBusDto: UpdateBusDto) {
    const bus = await this.findOne(id);
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

  async remove(id: string) {
    const bus = await this.findOne(id);
    try {
      await this.busRepository.softRemove(bus);
      return {
        message: 'Bus deleted successfully',
        deleted: bus,
      };
    } catch (error) {}
  }
}
