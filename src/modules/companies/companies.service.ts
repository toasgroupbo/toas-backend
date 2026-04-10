import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateCompanyDto, UpdateCompanyDto } from './dto';

import { StaticRoles } from 'src/auth/enums/roles.enum';

import { RolesService } from '../roles/roles.service';

import { Company } from './entities/company.entity';
import { Route } from '../routes/entities/route.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Office } from '../offices/entities/office.entity';
import { TravelStatus } from '../travels/enums';

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
  //?                                   Sales_Report                                                 */
  //? ============================================================================================== */

  async salesReport() {
    const companies = await this.companyRepository.find({
      where: { travels: { travel_status: TravelStatus.CLOSED } },
      relations: { travels: { tickets: true } },
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
        },
        buses: { busType: true },
        owners: true,
      },
    });

    if (!company) throw new NotFoundException();

    await this.dataSource.transaction(async (manager) => {
      //! 1. Obtener routeIds

      const routeIds = company.offices.flatMap((office) => [
        ...(office.origenRoutes?.map((r) => r.id) || []),
        ...(office.destinationRoutes?.map((r) => r.id) || []),
      ]);

      const uniqueRouteIds = [...new Set(routeIds)];

      //! 2. Deshabilitar travels

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

      //! 3. Deshabilitar routes

      if (uniqueRouteIds.length) {
        await manager.update(
          Route,
          { id: In(uniqueRouteIds) },
          { enabled: false },
        );
      }

      //! 4. Deshabilitar offices

      const officeIds = company.offices.map((o) => o.id);

      if (officeIds.length) {
        await manager.update(Office, { id: In(officeIds) }, { enabled: false });
      }

      //! 5. Eliminar cashiers

      for (const office of company.offices) {
        if (office.cashiers?.length) {
          await manager.softRemove(office.cashiers);
        }
      }

      //! 6. Otros (igual que ya tenías)

      if (company.bankAccount) {
        await manager.softRemove(company.bankAccount);
      }

      if (company.admin) {
        await manager.softRemove(company.admin);
      }

      if (company.buses?.length) {
        await manager.softRemove(company.buses);
      }

      //! 7. Eliminar company y owners

      await manager.softRemove(company);
    });

    return { message: 'Company deleted', company };
  }
}
