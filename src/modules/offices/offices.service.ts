import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateOfficeDto, UpdateOfficeDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { User } from '../users/entities/user.entity';
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

  async create(createOfficeDto: CreateOfficeDto, user: User) {
    try {
      const newOffice = this.officeRepository.create({
        ...createOfficeDto,
        company: user.company, //! se añade la company del user que crea la office
      });
      return await this.officeRepository.save(newOffice);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //! solo trae las offices de la company del user

  async findAll(user: User) {
    const offices = await this.officeRepository.find({
      where: { company: user.company },
    });
    return offices;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //! solo trae las offices de la company del user

  async findOne(id: string, user: User) {
    const office = await this.officeRepository.findOneBy({ id });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateOfficeDto: UpdateOfficeDto, user: User) {
    const office = await this.findOne(id, user);
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

  async remove(id: string, user: User) {
    const office = await this.findOne(id, user);
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
