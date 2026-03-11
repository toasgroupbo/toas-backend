import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateOfficeDto, UpdateOfficeDto } from './dto';

import { Office } from './entities/office.entity';

@Injectable()
export class OfficesService {
  constructor(
    @InjectRepository(Office)
    private readonly officeRepository: Repository<Office>,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(dto: CreateOfficeDto, companyId: number) {
    try {
      const newOffice = this.officeRepository.create({
        ...dto,
        company: { id: companyId },
        place: { id: dto.placeId },
      });
      return await this.officeRepository.save(newOffice);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number) {
    const offices = await this.officeRepository.find({
      where: { company: { id: companyId } },
      relations: { place: true },
    });
    return offices;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const office = await this.officeRepository.findOne({
      where: { id, company: { id: companyId } },
      relations: { place: true },
    });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateOfficeDto, companyId: number) {
    const office = await this.findOne(id, companyId);
    try {
      Object.assign(office, dto);
      return await this.officeRepository.save(office);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number, companyId: number) {
    const office = await this.findOne(id, companyId);
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
