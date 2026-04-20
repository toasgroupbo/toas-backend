import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreatePlaceDto } from './dto';
import { UpdatePlaceDto } from './dto/update-place.dto';

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

  async create(dto: CreatePlaceDto) {
    try {
      const newPlace = this.PlaceRepository.create({
        ...dto,
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
  //?                                         Update                                                 */
  //? ============================================================================================== */

  async update(id: number, dto: UpdatePlaceDto) {
    const place = await this.findOne(id);
    try {
      Object.assign(place, dto);
      return await this.PlaceRepository.save(place);
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
