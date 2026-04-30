import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { TravelForCashierFilterDto } from '../pagination';
import { paginate } from 'src/common/pagination/paginate';

import { TravelStatus } from '../enums';
import { SeatStatus } from 'src/common/enums';
import { PaymentType, TicketType } from 'src/modules/tickets/enums';
import { TicketStatus } from '../../tickets/enums/ticket-status.enum';

import { AssignStaffDto } from '../dto/assing-staff.dto';

import { StaffService } from '../staff.service';
import { TicketExpirationService } from '../../tickets/ticket-expiration.service';

import { Travel } from '../entities/travel.entity';
import { User } from '../../users/entities/user.entity';
import { Bus } from 'src/modules/buses/entities/bus.entity';
import { TravelSeat } from '../entities/travel-seat.entity';
import { Office } from '../../offices/entities/office.entity';
import { Owner } from 'src/modules/owners/entities/owner.entity';
import { CancelTravelDto } from '../dto';

@Injectable()
export class TravelsForCashierService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,

    @InjectRepository(TravelSeat)
    private readonly travelSeatRepository: Repository<TravelSeat>,

    private readonly ticketExpirationService: TicketExpirationService,

    private readonly staffService: StaffService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(filters: TravelForCashierFilterDto, office: Office) {
    const { destination_placeId, origin_placeId, startDate, endDate, status } =
      filters;

    const where: any = {
      travel_status: In([TravelStatus.ACTIVE, TravelStatus.CLOSED]),
      enabled: true,
      route: {
        officeOrigin: {
          id: office.id,
        },
      },
    };

    //! status
    if (status) where.travel_status = status;

    //! Origen
    /* if (origin_placeId) {
      where.route.officeOrigin = {
        place: {
          id: origin_placeId,
        },
      };
    } */

    //! Destino
    if (destination_placeId) {
      where.route.officeDestination = {
        place: {
          id: destination_placeId,
        },
      };
    }

    //! Por dia
    if (startDate && !endDate) {
      const start = new Date(`${startDate}T00:00:00-04:00`);
      const end = new Date(`${startDate}T23:59:59.999-04:00`);
      where.departure_time = Between(start, end);
    }

    //! Entre dos fechas
    if (startDate && endDate) {
      const from = new Date(`${startDate}T00:00:00-04:00`);
      const to = new Date(`${endDate}T23:59:59.999-04:00`);
      where.departure_time = Between(from, to);
    }

    const travels = await paginate(
      this.travelRepository,
      {
        where,
        order: { id: 'DESC' },
        relations: {
          bus: true,
          route: {
            officeOrigin: { place: true },
            officeDestination: { place: true },
          },
        },
      },
      filters,
    );

    /* const travelsWithSeats = await Promise.all(
      travels.data.map(async (travel) => {
        const seatsAvailable = await this.getSeatsAvailableCount(travel.id);
        return {
          ...travel,
          seatsAvailable,
        };
      }),
    ); */

    const travelIds = travels.data.map((t) => t.id);
    const statsMap = await this.getSeatsStatsByTravels(travelIds);

    const travelsWithSeats = travels.data.map((travel) => {
      const stats = statsMap.get(travel.id) || {
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

    const allTravels = await this.travelRepository.find({
      where,
      select: { cash_amount: true, qr_amount: true, app_amount: true },
    });

    const totals = allTravels.reduce(
      (acc, t) => {
        acc.office += Number(t.cash_amount) + Number(t.qr_amount);
        acc.app += Number(t.app_amount);
        return acc;
      },
      { office: 0, app: 0 },
    );

    return { data: travelsWithSeats, meta: travels.meta, amounts: totals };
  }

  //? ============================================================================================== */
  //?                               FindAllForOwners                                                 */
  //? ============================================================================================== */

  async findAllForOwners(filters: TravelForCashierFilterDto, cashier: User) {
    const { destination_placeId, origin_placeId, startDate, endDate, status } =
      filters;

    const owner = await this.ownerRepository.findOne({
      where: { users: { id: cashier.id } },
    });

    if (!owner) throw new NotFoundException('Owner not found');

    const where: any = {
      travel_status: In([
        TravelStatus.ACTIVE,
        TravelStatus.CLOSED,
        TravelStatus.CANCELLED,
      ]),
      enabled: true,
      bus: { owner: { id: owner.id } },
    };

    //! status
    if (status) where.travel_status = status;

    if (origin_placeId || destination_placeId) {
      where.route = {};

      //! Origen
      if (origin_placeId) {
        where.route.officeOrigin = {
          place: { id: origin_placeId },
        };
      }

      //! Destino
      if (destination_placeId) {
        where.route.officeDestination = {
          place: { id: destination_placeId },
        };
      }
    }

    //! Por dia
    if (startDate && !endDate) {
      const start = new Date(`${startDate}T00:00:00-04:00`);
      const end = new Date(`${startDate}T23:59:59.999-04:00`);
      where.departure_time = Between(start, end);
    }

    //! Entre dos fechas
    if (startDate && endDate) {
      const from = new Date(`${startDate}T00:00:00-04:00`);
      const to = new Date(`${endDate}T23:59:59.999-04:00`);
      where.departure_time = Between(from, to);
    }

    const travels = await paginate(
      this.travelRepository,
      {
        where,
        order: { id: 'DESC' },
        relations: {
          bus: true,
          route: {
            officeOrigin: { place: true },
            officeDestination: { place: true },
          },
        },
      },
      filters,
    );

    /* const travelsWithSeats = await Promise.all(
      travels.data.map(async (travel) => {
        const seatsAvailable = await this.getSeatsAvailableCount(travel.id);
        return {
          ...travel,
          seatsAvailable,
        };
      }),
    ); */

    const travelIds = travels.data.map((t) => t.id);
    const statsMap = await this.getSeatsStatsByTravels(travelIds);

    const travelsWithSeats = travels.data.map((travel) => {
      const stats = statsMap.get(travel.id) || {
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

    const allTravels = await this.travelRepository.find({
      where,
      select: { cash_amount: true, qr_amount: true, app_amount: true },
    });

    const totals = allTravels.reduce(
      (acc, t) => {
        acc.office += Number(t.cash_amount) + Number(t.qr_amount);
        acc.app += Number(t.app_amount);
        return acc;
      },
      { office: 0, app: 0 },
    );

    return { data: travelsWithSeats, meta: travels.meta, amounts: totals };
  }

  //? ============================================================================================== */

  async getSeatsStatsByTravels(travelIds: number[]) {
    if (!travelIds.length) return new Map();

    const raw = await this.travelSeatRepository
      .createQueryBuilder('ts')
      .leftJoin('ts.ticket', 't')
      .select('ts.travelId', 'travelId')
      .addSelect('COUNT(*)', 'totalSeats')
      .addSelect(
        `
      SUM(CASE 
        WHEN t.id IS NOT NULL AND t.type = :app THEN 1 
        ELSE 0 
      END)
    `,
        'seatsApp',
      )
      .addSelect(
        `
      SUM(CASE 
        WHEN t.id IS NOT NULL AND t.type = :office THEN 1 
        ELSE 0 
      END)
    `,
        'seatsOffice',
      )
      .addSelect(
        `
      SUM(CASE 
        WHEN t.id IS NULL THEN 1 
        ELSE 0 
      END)
    `,
        'seatsAvailable',
      )
      .where('ts.travelId IN (:...ids)', { ids: travelIds })
      .andWhere('(t.status IS NULL OR t.status != :cancelled)', {
        cancelled: TicketStatus.CANCELLED,
      })
      .groupBy('ts.travelId')
      .setParameters({
        app: TicketType.IN_APP,
        office: TicketType.IN_OFFICE,
      })
      .getRawMany();

    return new Map(
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

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(travelId: number, office: Office) {
    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(
        travelId,
        manager,
      );

      const travel = await manager.findOne(Travel, {
        where: {
          id: travelId,
          route: { officeOrigin: { id: office.id } },
          enabled: true,
        },
        relations: {
          bus: true,
          route: { officeOrigin: true, officeDestination: true },
          travelSeats: true,
        },
      });

      if (!travel) throw new NotFoundException('Travel not found');

      return travel;
    });
  }

  //? ============================================================================================== */
  //?                           Get_Seats_Available                                                  */
  //? ============================================================================================== */

  async getSeatsAvailable(travelId: number) {
    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(
        travelId,
        manager,
      );

      return await manager
        .createQueryBuilder(TravelSeat, 'seat')
        .where('seat.travelId = :travelId', { travelId })
        .andWhere(`seat.status = :available OR seat.status = :reserved`, {
          available: SeatStatus.AVAILABLE,
          reserved: SeatStatus.RESERVED,
        })
        .getMany();
    });
  }

  //? ============================================================================================== */
  //? ============================================================================================== */

  private async getSeatsAvailableCount(travelId: number): Promise<number> {
    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(
        travelId,
        manager,
      );

      return await manager
        .createQueryBuilder(TravelSeat, 'seat')
        .where('seat.travelId = :travelId', { travelId })
        .andWhere('seat.status IN (:...statuses)', {
          statuses: [SeatStatus.AVAILABLE, SeatStatus.RESERVED],
        })
        .getCount();
    });
  }

  //? ============================================================================================== */
  //?                                   AssignStaff                                                  */
  //? ============================================================================================== */

  async assignStaff(travelId: number, dto: AssignStaffDto, office: Office) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // 1. Verificar que el travel existe y está activo
      const travel = await manager.findOne(Travel, {
        where: {
          id: travelId,
          route: { officeOrigin: { id: office.id } },
          travel_status: TravelStatus.ACTIVE,
        },
      });

      if (!travel) {
        throw new NotFoundException('Active travel not found');
      }

      // 2. Procesar drivers (mínimo 1)
      if (!dto.drivers || dto.drivers.length === 0) {
        throw new BadRequestException('At least one driver is required');
      }

      const driversSnapshot: any[] = [];

      for (const driverDto of dto.drivers) {
        const staff = await this.staffService.createOrFind(
          driverDto,
          office.company,
          manager,
        );
        driversSnapshot.push({
          name: staff.name,
          ci: staff.ci,
          phone: staff.phone,
        });
      }

      // 3. Procesar assistants (opcional)
      const assistantsSnapshot: any[] = [];
      if (dto.assistants && dto.assistants.length > 0) {
        for (const assistantDto of dto.assistants) {
          const staff = await this.staffService.createOrFind(
            assistantDto,
            office.company,
            manager,
          );
          assistantsSnapshot.push({
            name: staff.name,
            ci: staff.ci,
            phone: staff.phone,
          });
        }
      }

      // 4. Guardar snapshots en el travel
      travel.drivers = driversSnapshot;
      travel.assistants = assistantsSnapshot;

      await manager.save(travel);
      await queryRunner.commitTransaction();

      return {
        message: 'Staff assigned successfully',
        travelId: travel.id,
        drivers: driversSnapshot,
        assistants: assistantsSnapshot,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                                        Closed                                                  */
  //? ============================================================================================== */

  async close(travelId: number, cashier: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    await this.ticketExpirationService.expireTravelIfNeeded(
      travelId,
      queryRunner.manager,
    );

    try {
      // --------------------------------------------
      // 1. BLOQUEAR viaje (SIN joins)
      // --------------------------------------------

      const lockedTravel = await queryRunner.manager
        .createQueryBuilder(Travel, 'travel')
        .setLock('pessimistic_write')
        .where('travel.id = :id', { id: travelId })
        .andWhere('travel.travel_status = :status', {
          status: TravelStatus.ACTIVE,
        })
        .getOne();

      if (!lockedTravel) {
        throw new NotFoundException('Active travel not found');
      }

      // --------------------------------------------
      // 2. Cargar relaciones (SIN LOCK)
      // --------------------------------------------

      const travel = await queryRunner.manager.findOne(Travel, {
        where: { id: lockedTravel.id },
        relations: {
          tickets: {
            travelSeats: true,
          },
          travelSeats: true,
        },
      });

      if (!travel) {
        throw new NotFoundException('Travel not found');
      }

      //! verificar que tenga choferes asignados antes de cerrar
      if (!travel.drivers || travel.drivers.length === 0) {
        throw new BadRequestException(
          'Cannot close travel: No drivers assigned. Please assign at least one driver before closing.',
        );
      }

      // --------------------------------------------
      // 3. CALCULAR MONTOS (CORREGIDO)
      // --------------------------------------------
      let total = 0; // Suma de total_price de tickets SOLD
      let total_commission = 0; // Suma de commission de tickets SOLD con QR

      let cash_amount = 0; // Suma de tickets SOLD con payment_type = CASH
      let qr_amount = 0; // Suma de total_price de tickets SOLD con QR
      let app_amount = 0;

      let tickets_app_count = 0;
      let tickets_office_count = 0;

      for (const ticket of travel.tickets) {
        if (ticket.status === TicketStatus.SOLD) {
          const price = Number(ticket.total_price);
          const commission = Number(ticket.commission);

          total += price;

          if (ticket.type === TicketType.IN_APP) {
            tickets_app_count++;

            app_amount +=
              Number(ticket.qr_amount) + Number(ticket.wallet_amount);

            total_commission += commission;
          } else if (ticket.type === TicketType.IN_OFFICE) {
            tickets_office_count++;

            if (ticket.payment_type === PaymentType.QR) {
              qr_amount += Number(ticket.qr_amount);
            } else if (ticket.payment_type === PaymentType.CASH) {
              cash_amount += price;
            }
          }
        }
      }

      // net_to_company = SOLO lo que se pagó con QR y la app menos la comisión
      const net_to_company = qr_amount + app_amount - total_commission;

      // --------------------------------------------
      // 4. GUARDAR MONTOS EN EL TRAVEL
      // --------------------------------------------

      travel.total = total.toString();

      travel.cash_amount = cash_amount.toString();
      travel.qr_amount = qr_amount.toString();

      travel.app_amount = app_amount.toString();

      travel.total_commission = total_commission.toString();
      travel.net_to_company = net_to_company.toString();

      travel.tickets_app_count = tickets_app_count;
      travel.tickets_office_count = tickets_office_count;
      travel.tickets_count = tickets_app_count + tickets_office_count;

      // --------------------------------------------
      // 5. CERRAR VIAJE
      // --------------------------------------------

      travel.travel_status = TravelStatus.CLOSED;
      travel.closedAt = new Date();
      travel.closedBy = cashier;

      const now = new Date();

      // --------------------------------------------
      // 6. PROCESAR TICKETS (RESERVED)
      // --------------------------------------------

      for (const ticket of travel.tickets) {
        if (ticket.status === TicketStatus.RESERVED) {
          if (ticket.reserve_expiresAt && ticket.reserve_expiresAt < now) {
            ticket.status = TicketStatus.EXPIRED;
          } else {
            ticket.status = TicketStatus.CANCELLED_FOR_CLOSE;
          }
          ticket.reserve_expiresAt = null;
        }
      }

      // --------------------------------------------
      // 7. PROCESAR ASIENTOS
      // --------------------------------------------
      for (const seat of travel.travelSeats) {
        if (seat.status !== SeatStatus.SOLD) {
          seat.status = SeatStatus.UNSOLD;
          seat.price = '0';
          seat.ticket = null;
        }
      }

      // --------------------------------------------
      // 8. PERSISTIR CAMBIOS
      // --------------------------------------------

      await queryRunner.manager.save(travel);
      await queryRunner.manager.save(travel.tickets);
      await queryRunner.manager.save(travel.travelSeats);

      await queryRunner.commitTransaction();

      return {
        message: 'Travel closed successfully',
        travel,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }
}
