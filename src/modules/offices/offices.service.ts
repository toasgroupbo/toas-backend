import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

  async create(createOfficeDto: CreateOfficeDto, companyUUID: string) {
    try {
      const newOffice = this.officeRepository.create({
        ...createOfficeDto,
        company: { id: companyUUID }, //! se añade la company del user que crea la office
      });
      return await this.officeRepository.save(newOffice);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(companyUUID: string) {
    const offices = await this.officeRepository.find({
      where: { company: { id: companyUUID } },
    });
    return offices;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string, companyUUID: string) {
    const office = await this.officeRepository.findOne({
      where: { id, company: { id: companyUUID } },
    });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(
    id: string,
    updateOfficeDto: UpdateOfficeDto,
    companyUUID: string,
  ) {
    const office = await this.findOne(id, companyUUID);
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

  async remove(id: string, companyUUID: string) {
    const office = await this.findOne(id, companyUUID);
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
