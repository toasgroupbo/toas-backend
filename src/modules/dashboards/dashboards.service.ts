import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { TravelStatus } from '../travels/enums';
import { TicketType } from '../tickets/enums/ticket-type.enum';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';

import { Bus } from '../buses/entities/bus.entity';
import { User } from '../users/entities/user.entity';
import { Route } from '../routes/entities/route.entity';
import { Owner } from '../owners/entities/owner.entity';
import { Office } from '../offices/entities/office.entity';
import { Travel } from '../travels/entities/travel.entity';
import { TravelSeat } from '../travels/entities/travel-seat.entity';
import { Company } from '../companies/entities/company.entity';
import { CompanyOwner } from '../companies/entities/company-owners.entity';

@Injectable()
export class DashboardsService {
  constructor(private readonly dataSource: DataSource) {}

  //? ============================================================================================== */
  //?                                      Helpers                                                   */
  //? ============================================================================================== */

  private getTodayRange() {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private async getSeatsStatsByTravels(travelIds: number[]) {
    if (!travelIds.length) return new Map<number, any>();

    const travelSeatRepo = this.dataSource.getRepository(TravelSeat);

    const raw = await travelSeatRepo
      .createQueryBuilder('ts')
      .leftJoin('ts.ticket', 't')
      .select('ts.travelId', 'travelId')
      .addSelect('COUNT(*)', 'totalSeats')
      .addSelect(
        `SUM(CASE WHEN t.id IS NOT NULL AND t.type = :app AND t.status = :sold THEN 1 ELSE 0 END)`,
        'seatsApp',
      )
      .addSelect(
        `SUM(CASE WHEN t.id IS NOT NULL AND t.type = :office AND t.status = :sold THEN 1 ELSE 0 END)`,
        'seatsOffice',
      )
      .addSelect(
        `SUM(CASE WHEN t.id IS NULL OR t.status IN (:cancelled, :cancelledForClose, :expired) THEN 1 ELSE 0 END)`,
        'seatsAvailable',
      )
      .where('ts.travelId IN (:...ids)', { ids: travelIds })
      .groupBy('ts.travelId')
      .setParameters({
        app: TicketType.IN_APP,
        office: TicketType.IN_OFFICE,
        sold: TicketStatus.SOLD,
        cancelled: TicketStatus.CANCELLED,
        cancelledForClose: TicketStatus.CANCELLED_FOR_CLOSE,
        expired: TicketStatus.EXPIRED,
      })
      .getRawMany();

    return new Map<number, any>(
      raw.map((r) => [
        Number(r.travelId),
        {
          totalSeats: Number(r.totalSeats),
          seatsApp: Number(r.seatsApp),
          seatsOffice: Number(r.seatsOffice),
          seatsAvailable: Number(r.seatsAvailable),
        },
      ]),
    );
  }

  private mapTravelStats(stats: any[]) {
    return {
      active: Number(
        stats.find((s) => s.status === TravelStatus.ACTIVE)?.count || 0,
      ),

      cancelled: Number(
        stats.find((s) => s.status === TravelStatus.CANCELLED)?.count || 0,
      ),

      closed: Number(
        stats.find((s) => s.status === TravelStatus.CLOSED)?.count || 0,
      ),
    };
  }

  //? ============================================================================================== */
  //?                            Dashboard: General                                                  */
  //? ============================================================================================== */

  async getGeneralDashboard() {
    const companyRepo = this.dataSource.getRepository(Company);
    const ownerRepo = this.dataSource.getRepository(Owner);
    const busRepo = this.dataSource.getRepository(Bus);
    const officeRepo = this.dataSource.getRepository(Office);
    const routeRepo = this.dataSource.getRepository(Route);
    const userRepo = this.dataSource.getRepository(User);
    const travelRepo = this.dataSource.getRepository(Travel);

    const { start, end } = this.getTodayRange();

    // =========================================================
    // SUMMARY
    // =========================================================

    const [
      companies,
      owners,
      buses,
      offices,
      routes,
      cashiers,

      pendingDeposits,
      totalPendingAmount,

      activeCount,
      travelStats,

      upcomingTravels,
    ] = await Promise.all([
      companyRepo.count({
        where: {
          enabled: true,
        },
      }),

      ownerRepo.count({
        where: {
          enabled: true,
        },
      }),

      busRepo.count({
        where: {
          enabled: true,
        },
      }),

      officeRepo.count({
        where: {
          enabled: true,
        },
      }),

      routeRepo.count({
        where: {
          enabled: true,
        },
      }),

      userRepo
        .createQueryBuilder('user')
        .where('user.officeId IS NOT NULL')
        .andWhere('user.enabled = true')
        .getCount(),

      // DEPÓSITOS PENDIENTES
      travelRepo.count({
        where: {
          enabled: true,
          isPaid: false,
          travel_status: TravelStatus.CLOSED,
        },
      }),

      // MONTO TOTAL PENDIENTE
      travelRepo
        .createQueryBuilder('travel')
        .select('COALESCE(SUM(travel.net_to_company), 0)', 'total')
        .where('travel.enabled = true')
        .andWhere('travel.isPaid = false')
        .andWhere('travel.travel_status = :status', {
          status: TravelStatus.CLOSED,
        })
        .getRawOne(),

      // TOTAL VIAJES ACTIVOS (sin filtro de fecha)
      travelRepo.count({
        where: {
          enabled: true,
          travel_status: TravelStatus.ACTIVE,
        },
      }),

      // ESTADÍSTICAS DE HOY (cancelados y cerrados)
      travelRepo
        .createQueryBuilder('travel')
        .select('travel.travel_status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('travel.enabled = true')
        .andWhere('travel.departure_time BETWEEN :start AND :end', {
          start,
          end,
        })
        .groupBy('travel.travel_status')
        .getRawMany(),

      // PRÓXIMAS SALIDAS
      travelRepo
        .createQueryBuilder('travel')
        .leftJoinAndSelect('travel.company', 'company')
        .leftJoinAndSelect('travel.bus', 'bus')
        .leftJoinAndSelect('travel.route', 'route')
        .leftJoinAndSelect('route.officeOrigin', 'origin')
        .leftJoinAndSelect('route.officeDestination', 'destination')
        .leftJoinAndSelect('origin.place', 'originPlace')
        .leftJoinAndSelect('destination.place', 'destinationPlace')
        .where('travel.enabled = true')
        .andWhere('travel.travel_status IN (:...statuses)', {
          statuses: [TravelStatus.ACTIVE, TravelStatus.CLOSED],
        })
        .orderBy('travel.departure_time', 'ASC')
        .take(20)
        .getMany(),
    ]);

    const mappedStats = this.mapTravelStats(travelStats);

    const travelIds = upcomingTravels.map((t) => t.id);
    const seatsMap = await this.getSeatsStatsByTravels(travelIds);

    const travels = upcomingTravels.map((travel) => {
      const stats = seatsMap.get(travel.id) || {
        totalSeats: 0,
        seatsApp: 0,
        seatsOffice: 0,
        seatsAvailable: 0,
      };
      return {
        ...travel,
        totalBusSeats: stats.totalSeats,
        seatsApp: stats.seatsApp,
        seatsOffice: stats.seatsOffice,
        seatsAvailable: stats.seatsAvailable,
        totalSoldSeats: stats.seatsApp + stats.seatsOffice,
      };
    });

    return {
      summary: {
        companies,
        owners,
        buses,
        offices,
        routes,
        cashiers,
      },

      travels_today: {
        actives: activeCount,
        canceled: mappedStats.cancelled,
        closed: mappedStats.closed,

        total: activeCount + mappedStats.cancelled + mappedStats.closed,
      },

      deposits: {
        pendingDeposits,
        amount_pending: Number(totalPendingAmount?.total || 0),
      },

      travels,
    };
  }

  //? ============================================================================================== */
  //?                            Dashboard: Company                                                  */
  //? ============================================================================================== */

  async getCompanyDashboard(companyId: number) {
    const companyRepo = this.dataSource.getRepository(Company);
    const busRepo = this.dataSource.getRepository(Bus);
    const officeRepo = this.dataSource.getRepository(Office);
    const routeRepo = this.dataSource.getRepository(Route);
    const userRepo = this.dataSource.getRepository(User);
    const travelRepo = this.dataSource.getRepository(Travel);
    const ownerCompanyRepo = this.dataSource.getRepository(CompanyOwner);

    // =========================================================
    // VALIDAR EMPRESA
    // =========================================================

    const company = await companyRepo.findOne({
      where: {
        id: companyId,
        enabled: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const { start, end } = this.getTodayRange();

    // =========================================================
    // CONTADORES
    // =========================================================

    const [
      owners,
      buses,
      offices,
      routes,
      cashiers,

      pendingDeposits,
      totalPendingAmount,

      activeCount,
      travelStats,

      upcomingTravels,
    ] = await Promise.all([
      // OWNERS
      ownerCompanyRepo.count({
        where: {
          enabled: true,
          company: {
            id: companyId,
          },
        },
      }),

      // BUSES
      busRepo.count({
        where: {
          enabled: true,
          company: {
            id: companyId,
          },
        },
      }),

      // OFFICES
      officeRepo.count({
        where: {
          enabled: true,
          company: {
            id: companyId,
          },
        },
      }),

      // ROUTES
      routeRepo
        .createQueryBuilder('route')
        .leftJoin('route.officeOrigin', 'origin')
        .leftJoin('route.officeDestination', 'destination')
        .select('COUNT(DISTINCT route.id)', 'count')
        .where('route.enabled = true')
        .andWhere(
          `
          (
            origin.companyId = :companyId
            OR destination.companyId = :companyId
          )
          `,
          { companyId },
        )
        .getRawOne(),

      // CASHIERS
      userRepo
        .createQueryBuilder('user')
        .where('user.companyId = :companyId', { companyId })
        .andWhere('user.officeId IS NOT NULL')
        .andWhere('user.enabled = true')
        .getCount(),

      // DEPÓSITOS PENDIENTES
      travelRepo.count({
        where: {
          enabled: true,
          company: {
            id: companyId,
          },
          isPaid: false,
          travel_status: TravelStatus.CLOSED,
        },
      }),

      // TOTAL PENDIENTE
      travelRepo
        .createQueryBuilder('travel')
        .select('COALESCE(SUM(travel.net_to_company), 0)', 'total')
        .where('travel.enabled = true')
        .andWhere('travel.companyId = :companyId', {
          companyId,
        })
        .andWhere('travel.isPaid = false')
        .andWhere('travel.travel_status = :status', {
          status: TravelStatus.CLOSED,
        })
        .getRawOne(),

      // TOTAL VIAJES ACTIVOS (sin filtro de fecha)
      travelRepo.count({
        where: {
          enabled: true,
          company: { id: companyId },
          travel_status: TravelStatus.ACTIVE,
        },
      }),

      // ESTADÍSTICAS DE HOY (cancelados y cerrados)
      travelRepo
        .createQueryBuilder('travel')
        .select('travel.travel_status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('travel.enabled = true')
        .andWhere('travel.companyId = :companyId', {
          companyId,
        })
        .andWhere('travel.departure_time BETWEEN :start AND :end', {
          start,
          end,
        })
        .groupBy('travel.travel_status')
        .getRawMany(),

      // PRÓXIMOS VIAJES
      travelRepo
        .createQueryBuilder('travel')
        .leftJoinAndSelect('travel.company', 'company')
        .leftJoinAndSelect('travel.bus', 'bus')
        .leftJoinAndSelect('bus.owner', 'owner')
        .leftJoinAndSelect('travel.route', 'route')
        .leftJoinAndSelect('route.officeOrigin', 'origin')
        .leftJoinAndSelect('route.officeDestination', 'destination')
        .leftJoinAndSelect('origin.place', 'originPlace')
        .leftJoinAndSelect('destination.place', 'destinationPlace')
        .where('travel.enabled = true')
        .andWhere('travel.companyId = :companyId', {
          companyId,
        })
        .andWhere('travel.travel_status IN (:...statuses)', {
          statuses: [TravelStatus.ACTIVE, TravelStatus.CLOSED],
        })
        .orderBy('travel.departure_time', 'ASC')
        .take(20)
        .getMany(),
    ]);

    const mappedStats = this.mapTravelStats(travelStats);

    const travelIds = upcomingTravels.map((t) => t.id);
    const seatsMap = await this.getSeatsStatsByTravels(travelIds);

    const travels = upcomingTravels.map((travel) => {
      const stats = seatsMap.get(travel.id) || {
        totalSeats: 0,
        seatsApp: 0,
        seatsOffice: 0,
        seatsAvailable: 0,
      };
      return {
        ...travel,
        totalBusSeats: stats.totalSeats,
        seatsApp: stats.seatsApp,
        seatsOffice: stats.seatsOffice,
        seatsAvailable: stats.seatsAvailable,
        totalSoldSeats: stats.seatsApp + stats.seatsOffice,
      };
    });

    return {
      company: {
        id: company.id,
        name: company.name,
        logo: company.logo,
      },

      summary: {
        owners,
        buses,
        offices,
        routes: Number(routes?.count || 0),
        cashiers,
      },

      travels_today: {
        actives: activeCount,
        canceled: mappedStats.cancelled,
        closed: mappedStats.closed,

        total: activeCount + mappedStats.cancelled + mappedStats.closed,
      },

      deposits: {
        pendingDeposits,
        amount_pending: Number(totalPendingAmount?.total || 0),
      },

      travels,
    };
  }
}

/* @Injectable()
export class DashboardsService {
  constructor(private dataSource: DataSource) {}
  async getGeneralDashboard() {
    const companyRepo = this.dataSource.getRepository(Company);
    const ownerRepo = this.dataSource.getRepository(Owner);
    const busRepo = this.dataSource.getRepository(Bus);
    const officeRepo = this.dataSource.getRepository(Office);
    const routeRepo = this.dataSource.getRepository(Route);
    const userRepo = this.dataSource.getRepository(User);
    const travelRepo = this.dataSource.getRepository(Travel);

    // =========================================================
    // FECHA ACTUAL
    // =========================================================
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // =========================================================
    // CONTADORES GENERALES
    // =========================================================

    const [
      companies,
      owners,
      buses,
      offices,
      routes,
      cashiers,

      activeToday,

      cancelledToday,
      closedToday,

      pendingDeposits,
      totalPendingAmount,

      upcomingTravels,
    ] = await Promise.all([
      companyRepo.count(),

      ownerRepo.count(),

      busRepo.count(),

      officeRepo.count(),

      routeRepo.count(),

      userRepo
        .createQueryBuilder('user')
        .where('user.officeId IS NOT NULL')
        .getCount(),

      // VIAJES ACTIVOS HOY
      travelRepo.count({
        where: {
          departure_time: Between(startOfDay, endOfDay),
          travel_status: TravelStatus.ACTIVE,
        },
      }),

      // CANCELADOS
      travelRepo.count({
        where: {
          departure_time: Between(startOfDay, endOfDay),
          travel_status: TravelStatus.CANCELLED,
        },
      }),

      // CERRADOS
      travelRepo.count({
        where: {
          departure_time: Between(startOfDay, endOfDay),
          travel_status: TravelStatus.CLOSED,
        },
      }),

      // DEPÓSITOS PENDIENTES
      travelRepo.count({
        where: {
          isPaid: false,
          travel_status: TravelStatus.CLOSED,
        },
      }),

      // MONTO TOTAL PENDIENTE
      travelRepo
        .createQueryBuilder('travel')
        .select('COALESCE(SUM(travel.net_to_company), 0)', 'total')
        .where('travel.isPaid = false')
        .andWhere('travel.travel_status = :status', {
          status: TravelStatus.CLOSED,
        })
        .getRawOne(),

      // PRÓXIMAS SALIDAS
      travelRepo.find({

        relations: {
          company: true,
          bus: true,
          route: {
            officeOrigin: {
              place: true,
            },
            officeDestination: {
              place: true,
            },
          },
        },
        order: {
          departure_time: 'ASC',
        },
        take: 20,
      }),
    ]);

    // =========================================================
    // RESPUESTA DASHBOARD
    // =========================================================

    return {
      summary: {
        companies: companies,
        owners: owners,
        buses,
        offices: offices,
        routes: routes,
        cashiers: cashiers,
      },

      travels_today: {
        actives: activeToday,
        canceled: cancelledToday,
        closed: closedToday,
        total: activeToday + cancelledToday + closedToday,
      },

      depositos: {
        pendingDeposits,
        amount_pending: Number(totalPendingAmount?.total || 0),
      },

      travels: upcomingTravels,
    };
  }

  

  async getCompanyDashboard(companyId: number) {
    const companyRepo = this.dataSource.getRepository(Company);
    const busRepo = this.dataSource.getRepository(Bus);
    const officeRepo = this.dataSource.getRepository(Office);
    const routeRepo = this.dataSource.getRepository(Route);
    const userRepo = this.dataSource.getRepository(User);
    const travelRepo = this.dataSource.getRepository(Travel);

    // =========================================================
    // VALIDAR EMPRESA
    // =========================================================
    const company = await companyRepo.findOne({
      where: { id: companyId },
      relations: {
        owners: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // =========================================================
    // FECHA ACTUAL
    // =========================================================
    const today = new Date();

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // =========================================================
    // CONTADORES
    // =========================================================

    const [
      owners,
      buses,
      offices,
      routes,
      cashiers,

      activeToday,
      cancelledToday,
      closedToday,

      pendingDeposits,
      totalPendingAmount,

      upcomingTravels,
    ] = await Promise.all([
      // Dueños de la empresa
      company.owners.length,

      // Buses
      busRepo.count({
        where: {
          company: {
            id: companyId,
          },
        },
      }),

      // Oficinas
      officeRepo.count({
        where: {
          company: {
            id: companyId,
          },
        },
      }),

      // Rutas relacionadas por oficinas de la empresa
      routeRepo
        .createQueryBuilder('route')
        .leftJoin('route.officeOrigin', 'origin')
        .leftJoin('route.officeDestination', 'destination')
        .where('origin.companyId = :companyId', { companyId })
        .orWhere('destination.companyId = :companyId', { companyId })
        .getCount(),

      // Cajeros
      userRepo.count({
        where: {
          company: {
            id: companyId,
          },
        },
      }),

      // VIAJES ACTIVOS HOY
      travelRepo.count({
        where: {
          company: {
            id: companyId,
          },
          departure_time: Between(startOfDay, endOfDay),
          travel_status: TravelStatus.ACTIVE,
        },
      }),

      // CANCELADOS HOY
      travelRepo.count({
        where: {
          company: {
            id: companyId,
          },
          departure_time: Between(startOfDay, endOfDay),
          travel_status: TravelStatus.CANCELLED,
        },
      }),

      // CERRADOS HOY
      travelRepo.count({
        where: {
          company: {
            id: companyId,
          },
          departure_time: Between(startOfDay, endOfDay),
          travel_status: TravelStatus.CLOSED,
        },
      }),

      // DEPÓSITOS PENDIENTES
      travelRepo.count({
        where: {
          company: {
            id: companyId,
          },
          isPaid: false,
          travel_status: TravelStatus.CLOSED,
        },
      }),

      // MONTO PENDIENTE
      travelRepo
        .createQueryBuilder('travel')
        .select('COALESCE(SUM(travel.net_to_company), 0)', 'total')
        .where('travel.companyId = :companyId', { companyId })
        .andWhere('travel.isPaid = false')
        .andWhere('travel.travel_status = :status', {
          status: TravelStatus.CLOSED,
        })
        .getRawOne(),

      // VIAJES DE LA EMPRESA
      travelRepo.find({
        where: {
          company: {
            id: companyId,
          },
        },
        relations: {
          company: true,
          bus: { owner: true },
          route: {
            officeOrigin: {
              place: true,
            },
            officeDestination: {
              place: true,
            },
          },
        },
        order: {
          departure_time: 'ASC',
        },
        take: 20,
      }),
    ]);

    // =========================================================
    // RESPUESTA
    // =========================================================

    return {
      company: {
        id: company.id,
        name: company.name,
        logo: company.logo,
      },

      summary: {
        owners,
        buses,
        offices,
        routes,
        cashiers,
      },

      travels_today: {
        actives: activeToday,
        canceled: cancelledToday,
        closed: closedToday,
        total: activeToday + cancelledToday + closedToday,
      },

      deposits: {
        pendingDeposits,
        amount_pending: Number(totalPendingAmount?.total || 0),
      },

      travels: upcomingTravels,
    };
  }
} */
