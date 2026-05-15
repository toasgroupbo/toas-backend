import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { TravelStatus } from '../travels/enums';
import { StaticRoles } from 'src/auth/enums/roles.enum';

import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { ReportPaginationDto } from './pagination/report-pagination.dto';

import { RolesService } from '../roles/roles.service';

import { Bus } from '../buses/entities/bus.entity';
import { Company } from './entities/company.entity';
import { Route } from '../routes/entities/route.entity';
import { Owner } from '../owners/entities/owner.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Office } from '../offices/entities/office.entity';
import { BusType } from '../buses/entities/bus-type.entity';
import { CompanyOwner } from './entities/company-owners.entity';

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

      const rol = await this.rolService.findOneByName(
        StaticRoles.COMPANY_ADMIN,
      );
      if (!rol) {
        throw new NotFoundException('Role COMPANY_ADMIN not found');
      }

      const newCompany = this.companyRepository.create({
        ...data,
        commission_company: String(data.commission_company),
        users: [{ ...manager, rol: { id: rol.id } }],
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
      where: {
        enabled: true,
        users: { rol: { name: StaticRoles.COMPANY_ADMIN } },
      },
      relations: { bankAccount: true, users: true },
    });
    return companies;
  }

  //? ============================================================================================== */
  //?                                   Sales_Report                                                 */
  //? ============================================================================================== */

  async salesReport(pagination: ReportPaginationDto) {
    let { startDate, endDate } = pagination;

    let start: Date;
    let end: Date;

    // --------------------------------
    // NORMALIZAR FECHAS
    // --------------------------------

    if (startDate && endDate) {
      // rango completo
      start = new Date(`${startDate}T00:00:00-04:00`);
      end = new Date(`${endDate}T23:59:59.999-04:00`);
    } else if (startDate && !endDate) {
      // solo un día
      start = new Date(`${startDate}T00:00:00-04:00`);
      end = new Date(`${startDate}T23:59:59.999-04:00`);
    } else if (!startDate && endDate) {
      // hasta cierta fecha
      start = new Date('1970-01-01T00:00:00-04:00');
      end = new Date(`${endDate}T23:59:59.999-04:00`);
    } else {
      // default: hoy
      const now = new Date();

      start = new Date(now);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    // --------------------------------
    // QUERY
    // --------------------------------

    const result = await this.companyRepository
      .createQueryBuilder('company')

      //! SOLO EMPRESAS HABILITADAS
      .where('company.enabled = :enabled', {
        enabled: true,
      })

      //! join filtrado
      .leftJoin(
        'company.travels',
        'travel',
        `
      travel.travel_status = :status
      AND travel.closedAt BETWEEN :start AND :end
    `,
        {
          status: TravelStatus.CLOSED,
          start,
          end,
        },
      )

      //! SELECT
      .select('company.id', 'companyId')
      .addSelect('company.name', 'companyName')

      .addSelect('COALESCE(SUM(travel.total), 0)', 'total')
      .addSelect('COALESCE(SUM(travel.total_commission), 0)', 'totalCommission')
      .addSelect('COALESCE(SUM(travel.net_to_company), 0)', 'netToCompany')

      .addSelect(
        'COALESCE(SUM(travel.tickets_office_count), 0)',
        'ticketsOfficeCount',
      )
      .addSelect('COALESCE(SUM(travel.cash_amount), 0)', 'cashAmount')
      .addSelect('COALESCE(SUM(travel.qr_amount), 0)', 'qrAmount')

      .addSelect(
        'COALESCE(SUM(travel.tickets_app_count), 0)',
        'ticketsAppCount',
      )
      .addSelect('COALESCE(SUM(travel.app_amount), 0)', 'appAmount')

      .addSelect('COALESCE(SUM(travel.tickets_count), 0)', 'ticketsCount')

      //! GROUP BY
      .groupBy('company.id')
      .addGroupBy('company.name')

      // ordenar por más ventas
      .orderBy('total', 'DESC')

      .getRawMany();

    return result;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number) {
    const company = await this.companyRepository.findOne({
      where: {
        id,
        users: { rol: { name: StaticRoles.COMPANY_ADMIN } },
        enabled: true,
      },
      relations: { bankAccount: true, users: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, dto: UpdateCompanyDto) {
    const company = await this.companyRepository.findOne({
      where: { id, enabled: true },
      relations: { bankAccount: true },
    });

    if (!company) throw new NotFoundException('Company not found');

    try {
      const { bankAccount, ...rest } = dto;

      Object.assign(company, rest);

      if (bankAccount) {
        Object.assign(company.bankAccount, bankAccount);
      }

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
      where: { id, enabled: true },
      relations: {
        bankAccount: true,
        users: true,

        offices: {
          cashiers: true,
          origenRoutes: true,
          destinationRoutes: true,
        },

        buses: {
          busType: true,
          travels: true,
          owner: {
            companyOwner: {
              company: true,
            },
            users: true,
          },
        },

        companyOwner: {
          owner: {
            users: true,
            companyOwner: {
              company: true,
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company Not Found');
    }

    await this.dataSource.transaction(async (manager) => {
      //! Obtener routeIds
      const routeIds = company.offices.flatMap((office) => [
        ...(office.origenRoutes?.map((r) => r.id) || []),
        ...(office.destinationRoutes?.map((r) => r.id) || []),
      ]);

      const uniqueRouteIds = [...new Set(routeIds)];

      //! Deshabilitar travels
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

      //! Deshabilitar routes
      if (uniqueRouteIds.length) {
        await manager.update(
          Route,
          { id: In(uniqueRouteIds) },
          { enabled: false },
        );
      }

      //! Deshabilitar offices
      const officeIds = company.offices.map((o) => o.id);
      if (officeIds.length) {
        await manager.update(Office, { id: In(officeIds) }, { enabled: false });
      }

      //! Soft delete cashiers
      for (const office of company.offices) {
        if (office.cashiers?.length) {
          await manager.softRemove(office.cashiers);
        }
      }

      //! Deshabilitar buses
      const busIds = company.buses.map((b) => b.id);

      if (busIds.length) {
        await manager.update(
          Bus,
          {
            id: In(busIds),
          },
          {
            enabled: false,
          },
        );
      }

      //! Deshabilitar busTypes
      const busTypeIds = company.buses
        .filter((b) => b.busType)
        .map((b) => b.busType.id);

      if (busTypeIds.length) {
        await manager.update(
          BusType,
          {
            id: In(busTypeIds),
          },
          {
            enabled: false,
          },
        );
      }

      //! Deshabilitar relación OwnerCompany
      await manager.update(
        CompanyOwner,
        {
          company: { id: company.id },
          enabled: true,
        },
        {
          enabled: false,
        },
      );

      //! Deshabilitar owners sin relaciones activas
      for (const relation of company.companyOwner) {
        const owner = relation.owner;

        const activeRelations = owner.companyOwner.filter(
          (oc) => oc.company.id !== company.id && oc.enabled,
        );

        //! Si ya no tiene companies activas
        if (!activeRelations.length) {
          //! Soft delete users
          if (owner.users?.length) {
            await manager.softRemove(owner.users);
          }

          //! Deshabilitar owner
          await manager.update(Owner, { id: owner.id }, { enabled: false });
        }
      }

      //! Soft delete users de company
      if (company.users?.length) {
        await manager.softRemove(company.users);
      }

      //! Soft delete bank account
      /* if (company.bankAccount) {
        await manager.softRemove(company.bankAccount);
      } */

      //! Deshabilitar company
      await manager.update(Company, { id: company.id }, { enabled: false });
    });

    return {
      message: 'Company disabled',
      company,
    };
  }

  /* async remove(id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: {
        bankAccount: true,
        users: true,
        offices: true,
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

      //! 6. Otros

      if (company.bankAccount) {
        await manager.softRemove(company.bankAccount);
      }

      if (company.users.length) {
        await manager.softRemove(company.users);
      }

      if (company.buses?.length) {
        await manager.softRemove(company.buses);
      }

      if (company.owners?.length) {
        await manager.softRemove(company.owners);
      }

      //! 7. Eliminar company y owners
      await manager.update(Company, { id: company.id }, { enabled: false });
    });

    return { message: 'Company deleted', company };
  } */
}
