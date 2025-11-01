import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateOfficeDto, UpdateOfficeDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Office } from './entities/office.entity';

@Injectable()
export class OfficesService {
  constructor(
    @InjectRepository(Office)
    private readonly officeRepository: Repository<Office>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createOfficeDto: CreateOfficeDto) {
    try {
      const newOffice = this.officeRepository.create({
        ...createOfficeDto,
        company: { id: createOfficeDto.company },
      });
      return await this.officeRepository.save(newOffice);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(pagination: PaginationDto) {
    const offices = await this.officeRepository.find({});
    return offices;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string) {
    const office = await this.officeRepository.findOneBy({ id });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateOfficeDto: UpdateOfficeDto) {
    const office = await this.findOne(id);
    try {
      Object.assign(office, updateOfficeDto);
      return await this.officeRepository.save(office);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: string) {
    const office = await this.findOne(id);
    try {
      await this.officeRepository.softRemove(office);
      return {
        message: 'Office deleted successfully',
        deleted: office,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}
