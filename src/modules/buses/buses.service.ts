import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateBusDto, UpdateBusDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { User } from '../users/entities/user.entity';
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

      //! determina si un bus tiene o no decks
      let decks: boolean = false;
      if (busType.decks.length > 1) {
        decks = true;
      }

      const newBus = this.busRepository.create({
        ...data,
        owner: { id: createBusDto.owner },
        busType,
        decks,
      });
      return await this.busRepository.save(newBus);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(user: User) {
    const buses = await this.busRepository.find({
      where: { owner: { company: user.company } },
      relations: { owner: true, busType: true },
    });
    return buses;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string, user: User) {
    const bus = await this.busRepository.findOneBy({
      id,
      owner: { company: user.company },
    });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateBusDto: UpdateBusDto, user: User) {
    const bus = await this.findOne(id, user);
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

  async remove(id: string, user: User) {
    const bus = await this.findOne(id, user);
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
