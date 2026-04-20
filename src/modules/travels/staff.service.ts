import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Staff } from './entities/staff.entity';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  //? ============================================================================================== */
  //?                                  CreateOrFind                                                  */
  //? ============================================================================================== */

  async createOrFind(
    dto: { name: string; ci: string; phone?: string },
    company: Company,
    manager: EntityManager,
  ): Promise<Staff> {
    const repository = manager.getRepository(Staff);

    try {
      //! Buscar staff por CI
      let staff = await repository.findOne({
        where: { ci: dto.ci },
      });

      //! Si existe, actualizar nombre si es diferente
      if (staff && staff.name !== dto.name) {
        staff.name = dto.name;
        if (dto.phone) staff.phone = dto.phone;
        await repository.save(staff);
      }

      //! Si no existe, crear nuevo staff
      if (!staff) {
        staff = repository.create({
          name: dto.name,
          ci: dto.ci,
          phone: dto.phone,
        });
        await repository.save(staff);
      }

      //! Vincular staff a la company (si no está ya vinculado)
      const companyWithStaff = await manager.findOne(Company, {
        where: { id: company.id },
        relations: { staff: true },
      });

      if (companyWithStaff) {
        const alreadyLinked = companyWithStaff.staff.some(
          (s) => s.ci === dto.ci,
        );
        if (!alreadyLinked) {
          companyWithStaff.staff.push(staff);
          await manager.save(Company, companyWithStaff);
        }
      }

      return staff;
    } catch (error) {
      handleDBExceptions(error);
      throw error;
    }
  }

  //? ============================================================================================== */
  //?                                       FindOne                                                  */
  //? ============================================================================================== */

  async findOne(ci: string, companyId: number) {
    const staff = await this.staffRepository.findOne({
      where: { ci, companies: { id: companyId } },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    return staff;
  }
}
