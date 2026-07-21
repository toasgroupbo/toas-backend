import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { paginateAdvanced } from 'src/common/pagination/paginate-advanced';
import { CommissionPaginationDto } from './pagination/commission.pagination';

import { TravelStatus } from '../travels/enums';
import { TicketType, TicketStatus } from '../tickets/enums';

import { Commission } from './entities/commission.entity';
import { Travel } from '../travels/entities/travel.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,

    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create() {
    const closedTravels = await this.travelRepository
      .createQueryBuilder('travel')
      .leftJoin('travel.commission', 'commission')
      .where('travel.travel_status = :status', { status: TravelStatus.CLOSED })
      .andWhere('travel.deletedAt IS NULL')
      .andWhere('commission.id IS NULL')
      .leftJoinAndSelect('travel.company', 'company')
      .leftJoinAndSelect('travel.tickets', 'tickets')
      .getMany();

    for (const travel of closedTravels) {
      try {
        const company = travel.company;
        const commissionCompanyAtTime = Number(company.commission_company);

        // Tickets IN_APP cancelados: el cobro por QR/wallet ya ingresó a la
        // cuenta de la empresa antes de la cancelación, así que también
        // generan comisión (solo para este cálculo, no afecta al Travel).
        const cancelledAppTickets = (travel.tickets ?? []).filter(
          (ticket) =>
            ticket.type === TicketType.IN_APP &&
            ticket.status === TicketStatus.CANCELLED,
        );
        const cancelledAppCount = cancelledAppTickets.length;
        const cancelledAppCommission = cancelledAppTickets.reduce(
          (sum, ticket) => sum + Number(ticket.commission),
          0,
        );

        const ticketsAppCount = travel.tickets_app_count + cancelledAppCount;
        const commissionAppTotal =
          Number(travel.total_commission) + cancelledAppCommission;
        const commissionCompanyTotal = (
          commissionCompanyAtTime * ticketsAppCount
        ).toFixed(2);

        const commission = this.commissionRepository.create({
          travel,
          departure_time: travel.departure_time,
          commission_company: commissionCompanyAtTime.toFixed(2),
          tickets_app_count: ticketsAppCount,
          commission_app_total: commissionAppTotal.toFixed(2),
          commission_company_total: commissionCompanyTotal,
        });

        await this.commissionRepository.save(commission);
      } catch (error) {
        handleDBExceptions(error);
      }
    }
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  async findAll(filters: CommissionPaginationDto) {
    const { startDate, endDate } = filters;
    const where: any = {};

    if (startDate && endDate) {
      where.departure_time = Between(
        new Date(`${startDate}T00:00:00-04:00`),
        new Date(`${endDate}T23:59:59.999-04:00`),
      );
    } else if (startDate) {
      where.departure_time = MoreThanOrEqual(
        new Date(`${startDate}T00:00:00-04:00`),
      );
    }

    const [paginated, totals] = await Promise.all([
      paginateAdvanced(
        this.commissionRepository,
        filters,
        ['company.name'],
        ['travel.company'],
        { 'entity.departure_time': 'DESC' },
        true,
        where,
      ),
      this._getTotals(filters),
    ]);

    await this._enrichWithTravelDetails(paginated.data);

    return { ...paginated, totals };
  }

  //? ============================================================================================== */

  private async _getTotals(filters: CommissionPaginationDto) {
    const { startDate, endDate, search } = filters;

    const qb = this.commissionRepository
      .createQueryBuilder('entity')
      .select('SUM(entity.commission_app_total)', 'total_commission_app')
      .addSelect(
        'SUM(entity.commission_company_total)',
        'total_commission_company',
      );

    if (startDate && endDate) {
      qb.andWhere('entity.departure_time BETWEEN :start AND :end', {
        start: new Date(`${startDate}T00:00:00-04:00`),
        end: new Date(`${endDate}T23:59:59.999-04:00`),
      });
    } else if (startDate) {
      qb.andWhere('entity.departure_time >= :start', {
        start: new Date(`${startDate}T00:00:00-04:00`),
      });
    }

    if (search) {
      qb.leftJoin('entity.travel', 'travel')
        .leftJoin('travel.company', 'company')
        .andWhere('company.name ILIKE :search', { search: `%${search}%` });
    }

    const raw = await qb.getRawOne();

    return {
      total_commission_app: Number(raw?.total_commission_app ?? 0).toFixed(2),
      total_commission_company: Number(
        raw?.total_commission_company ?? 0,
      ).toFixed(2),
    };
  }

  //? ============================================================================================== */

  async findAllForCompany(companyId: number, filters: CommissionPaginationDto) {
    const { startDate, endDate } = filters;
    const where: any = {
      travel: { company: { id: companyId } },
    };

    if (startDate && endDate) {
      where.departure_time = Between(
        new Date(`${startDate}T00:00:00-04:00`),
        new Date(`${endDate}T23:59:59.999-04:00`),
      );
    } else if (startDate) {
      where.departure_time = MoreThanOrEqual(
        new Date(`${startDate}T00:00:00-04:00`),
      );
    }

    const [paginated, totals] = await Promise.all([
      paginateAdvanced(
        this.commissionRepository,
        filters,
        [],
        ['travel.company'],
        { 'entity.departure_time': 'DESC' },
        true,
        where,
      ),
      this._getTotalsForCompany(companyId, filters),
    ]);

    await this._enrichWithTravelDetails(paginated.data);

    return { ...paginated, totals };
  }

  //? ============================================================================================== */

  private async _getTotalsForCompany(
    companyId: number,
    filters: CommissionPaginationDto,
  ) {
    const { startDate, endDate } = filters;

    const qb = this.commissionRepository
      .createQueryBuilder('entity')
      .select(
        'SUM(entity.commission_company_total)',
        'total_commission_company',
      )
      .leftJoin('entity.travel', 'travel')
      .leftJoin('travel.company', 'company')
      .where('company.id = :companyId', { companyId });

    if (startDate && endDate) {
      qb.andWhere('entity.departure_time BETWEEN :start AND :end', {
        start: new Date(`${startDate}T00:00:00-04:00`),
        end: new Date(`${endDate}T23:59:59.999-04:00`),
      });
    } else if (startDate) {
      qb.andWhere('entity.departure_time >= :start', {
        start: new Date(`${startDate}T00:00:00-04:00`),
      });
    }

    const raw = await qb.getRawOne();

    return {
      total_commission_company: Number(
        raw?.total_commission_company ?? 0,
      ).toFixed(2),
    };
  }

  //? ============================================================================================== */

  private async _enrichWithTravelDetails(commissions: Commission[]) {
    if (!commissions.length) return;

    const travelIds = commissions.map((c) => c.travel.id);

    const travels = await this.travelRepository
      .createQueryBuilder('travel')
      .leftJoinAndSelect('travel.bus', 'bus')
      .leftJoinAndSelect('travel.route', 'route')
      .leftJoinAndSelect('route.officeOrigin', 'officeOrigin')
      .leftJoinAndSelect('officeOrigin.place', 'placeOrigin')
      .leftJoinAndSelect('route.officeDestination', 'officeDestination')
      .leftJoinAndSelect('officeDestination.place', 'placeDestination')
      .where('travel.id IN (:...ids)', { ids: travelIds })
      .getMany();

    const travelMap = new Map(travels.map((t) => [t.id, t]));

    for (const commission of commissions) {
      const travel = travelMap.get(commission.travel.id);
      if (travel) {
        commission.travel.bus = travel.bus;
        commission.travel.route = travel.route;
      }
    }
  }
}
