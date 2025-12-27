import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreatePlaceDto } from './dto';

import { Place } from './entities/place.entity';

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Place)
    private readonly PlaceRepository: Repository<Place>,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(createPlaceDto: CreatePlaceDto) {
    try {
      const newPlace = this.PlaceRepository.create({
        ...createPlaceDto,
      });
      return await this.PlaceRepository.save(newPlace);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll() {
    const Places = await this.PlaceRepository.find({});
    return Places;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number) {
    const place = await this.PlaceRepository.findOne({
      where: { id },
    });
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number) {
    const place = await this.findOne(id);
    try {
      await this.PlaceRepository.softRemove(place);
      return {
        message: 'Place deleted successfully',
        deleted: place,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
