import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateCompanyDto, UpdateCompanyDto } from './dto';

import { StaticRoles } from 'src/auth/enums/roles.enum';

import { RolesService } from '../roles/roles.service';

import { Company } from './entities/company.entity';
import { Travel } from '../travels/entities/travel.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    private readonly rolService: RolesService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(dto: CreateCompanyDto) {
    try {
      const { bankAccount, manager, ...data } = dto;

      // --------------------------------------------
      // 1. Busqueda del rol de COMPANY_ADMIN
      // --------------------------------------------

      const rol = await this.rolService.findOneByName(
        StaticRoles.COMPANY_ADMIN,
      );
      if (!rol) {
        throw new NotFoundException('Role COMPANY_ADMIN not found');
      }

      // --------------------------------------------
      // 2. Creacion de la compania
      // --------------------------------------------

      const newCompany = this.companyRepository.create({
        ...data,
        admin: { ...manager, rol: rol },
        bankAccount,
      });

      return await this.companyRepository.save(newCompany);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll() {
    const companies = await this.companyRepository.find({
      relations: { bankAccount: true, admin: true },
    });
    return companies;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: { bankAccount: true, admin: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateCompanyDto) {
    const company = await this.findOne(id);
    try {
      Object.assign(company, dto);
      return await this.companyRepository.save(company);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: {
        bankAccount: true,
        admin: true,
        offices: {
          cashiers: true,
          origenRoutes: true,
          destinationRoutes: true,
        },
        owners: true,
        buses: { busType: true },
      },
    });

    if (!company) throw new NotFoundException();

    await this.dataSource.transaction(async (manager) => {
      const routeIds: number[] = [];

      for (const office of company.offices || []) {
        routeIds.push(
          ...(office.origenRoutes?.map((r) => r.id) || []),
          ...(office.destinationRoutes?.map((r) => r.id) || []),
        );
      }

      const uniqueRouteIds = [...new Set(routeIds)];

      if (uniqueRouteIds.length) {
        await manager.update(
          Travel,
          {
            route: { id: In(uniqueRouteIds) },
            enabled: true,
          },
          { enabled: false },
        );
      }

      for (const office of company.offices || []) {
        if (office.cashiers?.length) {
          await manager.softRemove(office.cashiers);
        }
      }

      const allRoutes = company.offices.flatMap((office) => [
        ...(office.origenRoutes || []),
        ...(office.destinationRoutes || []),
      ]);

      if (allRoutes.length) {
        await manager.softRemove(allRoutes);
      }

      if (company.offices?.length) {
        await manager.softRemove(company.offices);
      }

      if (company.bankAccount) {
        await manager.softRemove(company.bankAccount);
      }

      if (company.admin) {
        await manager.softRemove(company.admin);
      }

      if (company.buses?.length) {
        await manager.softRemove(company.buses);
      }

      await manager.softRemove(company);
    });

    return { message: 'Company deleted', company };
  }
}
