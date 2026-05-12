import { Injectable, NotFoundException } from '@nestjs/common';
import { Between, DataSource } from 'typeorm';

import { TravelStatus } from '../travels/enums';

import { Bus } from '../buses/entities/bus.entity';
import { User } from '../users/entities/user.entity';
import { Route } from '../routes/entities/route.entity';
import { Owner } from '../owners/entities/owner.entity';
import { Office } from '../offices/entities/office.entity';
import { Travel } from '../travels/entities/travel.entity';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class DashboardsService {
  constructor(private dataSource: DataSource) {}

  //? ============================================================================================== */
  //?                              Dashboard: Admin                                                  */
  //? ============================================================================================== */

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
        /* where: {
          departure_time: MoreThanOrEqual(today),
        }, */
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
}
