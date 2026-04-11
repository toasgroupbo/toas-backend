import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { ReportPaginationDto } from './pagination/report-pagination.dto';

import { TravelStatus } from '../travels/enums';
import { StaticRoles } from 'src/auth/enums/roles.enum';

import { RolesService } from '../roles/roles.service';

import { Company } from './entities/company.entity';
import { Route } from '../routes/entities/route.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Office } from '../offices/entities/office.entity';

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
      start = new Date('1970-01-01T00:00:00-04:00'); // inicio "seguro"
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

      // join filtrado (más eficiente)
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

      // --------------------------------
      // SELECT
      // --------------------------------
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

      // --------------------------------
      // GROUP BY
      // --------------------------------
      .groupBy('company.id')
      .addGroupBy('company.name')

      // opcional: ordenar por más ventas
      .orderBy('total', 'DESC')

      .getRawMany();

    return result;
  }

  /*   async salesReport(pagination: CompanyPaginationDto) {
    let { startDate, endDate } = pagination;

    if (!startDate || !endDate) {
      const now = new Date();

      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      startDate = startOfDay;
      endDate = endOfDay;
    }

    const result = await this.companyRepository
      .createQueryBuilder('company')
      .leftJoin('company.travels', 'travel')
      .where('travel.travel_status = :status', {
        status: TravelStatus.CLOSED,
      })
      .andWhere('travel.closedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .select('company.id', 'companyId')
      .addSelect('company.name', 'companyName')

      .addSelect('SUM(travel.total)', 'total')
      .addSelect('SUM(travel.total_commission)', 'totalCommission')
      .addSelect('SUM(travel.net_to_company)', 'netToCompany')

      .addSelect('SUM(travel.tickets_office_count)', 'ticketsOfficeCount')
      .addSelect('SUM(travel.cash_amount)', 'cashAmount')
      .addSelect('SUM(travel.qr_amount)', 'qrAmount')

      .addSelect('SUM(travel.tickets_app_count)', 'ticketsAppCount')
      .addSelect('SUM(travel.app_amount)', 'appAmount')

      .addSelect('SUM(travel.tickets_count)', 'ticketsCount')

      .groupBy('company.id')
      .addGroupBy('company.name')
      .getRawMany();

    return result;
  } */
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
    const company = await this.companyRepository.findOne({
      where: { id },
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

  /* async update(id: number, dto: UpdateCompanyDto) {
    const company = await this.findOne(id);
    try {
      Object.assign(company, dto);
      return await this.companyRepository.save(company);
    } catch (error) {
      handleDBExceptions(error);
    }
  } */

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
