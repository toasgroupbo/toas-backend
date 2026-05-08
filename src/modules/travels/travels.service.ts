import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, LessThan, MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { TravelStatus } from './enums';
import { SeatStatus } from 'src/common/enums';
import { TicketStatus, TicketType } from '../tickets/enums';

import { CancelTravelDto, CreateTravelDto } from './dto';
import { paginate } from 'src/common/pagination/paginate';
import { TravelPaginationDto } from './pagination/travel-pagination.dto';
import { ReportPaginationDto } from './pagination/report-pagination.dto';

import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { TicketExpirationService } from '../tickets/ticket-expiration.service';

import { Travel } from './entities/travel.entity';
import { Bus } from '../buses/entities/bus.entity';
import { User } from '../users/entities/user.entity';
import { Office } from '../offices/entities/office.entity';
import { TravelSeat } from './entities/travel-seat.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Injectable()
export class TravelsService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    @InjectRepository(TravelSeat)
    private readonly travelSeatRepository: Repository<TravelSeat>,

    private readonly ticketExpirationService: TicketExpirationService,

    private readonly userService: UsersService,

    private readonly walletService: WalletService,

    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(
    createTravelDto: CreateTravelDto,
    office: Office,
    cashier: User,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { busId, routeId, ...data } = createTravelDto;

      // --------------------------------------------
      // 1. Obtener el Bus con tipo y su layout
      // --------------------------------------------

      const bus = await queryRunner.manager.findOne(Bus, {
        where: { id: busId, company: { id: office.company.id } },
        relations: { busType: true, company: true },
      });

      if (!bus) throw new NotFoundException('Bus not found');

      // --------------------------------------------
      // 2. Validar que bus no tenga viajes solapados
      // --------------------------------------------

      const { departure_time, arrival_time } = data;

      const overlappingTravel = await queryRunner.manager.findOne(Travel, {
        where: {
          bus: { id: bus.id },
          travel_status: TravelStatus.ACTIVE,
          departure_time: LessThan(arrival_time),
          arrival_time: MoreThan(departure_time),
        },
      });

      if (overlappingTravel) {
        throw new ConflictException(
          'The bus already has a travel scheduled that overlaps with the selected departure or arrival time',
        );
      }
      // --------------------------------------------
      // 3. Generar seats segun maquetacion
      // --------------------------------------------

      const travelSeats = bus.busType.decks.flatMap((deck) =>
        deck.seats.map((seat) => ({
          ...seat,
          deck: deck.deck,
          deckType: deck.deckType,
        })),
      );

      // --------------------------------------------
      // 4. Creacion del Travel
      // --------------------------------------------

      const newTravel = queryRunner.manager.create(Travel, {
        ...data,
        route: { id: routeId },
        bus: bus,
        travelSeats,
        createdBy: { id: cashier.id },
        company: office.company,
      });
      const travelCreated = await queryRunner.manager.save(newTravel);

      await queryRunner.commitTransaction();
      return travelCreated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(pagination: TravelPaginationDto, companyId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const {
        status,
        //isPaid,
        endDate,
        startDate,
        origin_placeId,
        destination_placeId,
      } = pagination;

      const travelsToExpire = await manager.find(Travel, {
        select: { id: true },
      });

      for (const travel of travelsToExpire) {
        await this.ticketExpirationService.expireTravelIfNeeded(
          travel.id,
          manager,
        );
      }

      const options: any = {
        where: { company: { id: companyId } },
      };

      //! Pagados
      /* if (isPaid != undefined) {
        options.where.isPaid = isPaid;
      }
 */
      //! status
      if (status) {
        options.where.travel_status = status;
      }

      if (origin_placeId || destination_placeId) {
        options.where.route = {};

        //! origen
        if (origin_placeId) {
          options.where.route.officeOrigin = {
            place: { id: origin_placeId },
          };
        }

        //! Destino
        if (destination_placeId) {
          options.where.route.officeDestination = {
            place: { id: destination_placeId },
          };
        }
      }

      //! Por dia
      if (startDate && !endDate) {
        const start = new Date(`${startDate}T00:00:00-04:00`);
        const end = new Date(`${startDate}T23:59:59.999-04:00`);
        options.where.departure_time = Between(start, end);
      }

      //! Entre dos fechas
      if (startDate && endDate) {
        const from = new Date(`${startDate}T00:00:00-04:00`);
        const to = new Date(`${endDate}T23:59:59.999-04:00`);
        options.where.departure_time = Between(from, to);
      }

      const travels = await paginate(
        manager.getRepository(Travel),
        {
          ...options,
          order: { id: 'DESC' },
          relations: {
            //transaction: true,
            bus: true, //{ owner: { bankAccount: true } },
            route: { officeOrigin: true, officeDestination: true },
          },
        },
        pagination,
      );

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
        ...options,
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

      return {
        data: travelsWithSeats,
        meta: travels.meta,
        amounts: totals,
      };
    });
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
  //?                              FindAll_For_Admin                                                 */
  //? ============================================================================================== */

  async findAllForAdmin(pagination: TravelPaginationDto, companyId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const {
        status,
        isPaid,
        endDate,
        startDate,
        origin_placeId,
        destination_placeId,
      } = pagination;

      const travelsToExpire = await manager.find(Travel, {
        select: { id: true },
      });

      for (const travel of travelsToExpire) {
        await this.ticketExpirationService.expireTravelIfNeeded(
          travel.id,
          manager,
        );
      }

      const options: any = {
        where: { company: { id: companyId } },
      };

      //! Pagados
      if (isPaid != undefined) {
        options.where.isPaid = isPaid;
      }

      //! status
      if (status) {
        options.where.travel_status = status;
      }

      if (origin_placeId || destination_placeId) {
        options.where.route = {};

        //! origen
        if (origin_placeId) {
          options.where.route.officeOrigin = {
            place: { id: origin_placeId },
          };
        }

        //! Destino
        if (destination_placeId) {
          options.where.route.officeDestination = {
            place: { id: destination_placeId },
          };
        }
      }

      //! Por dia
      if (startDate && !endDate) {
        const start = new Date(`${startDate}T00:00:00-04:00`);
        const end = new Date(`${startDate}T23:59:59.999-04:00`);
        options.where.departure_time = Between(start, end);
      }

      //! Entre dos fechas
      if (startDate && endDate) {
        const from = new Date(`${startDate}T00:00:00-04:00`);
        const to = new Date(`${endDate}T23:59:59.999-04:00`);
        options.where.departure_time = Between(from, to);
      }

      const travels = await paginate(
        manager.getRepository(Travel),
        {
          ...options,
          order: { id: 'DESC' },
          relations: {
            transaction: true,
            bus: { owner: { bankAccount: true } },
            //route: { officeOrigin: true, officeDestination: true },
          },
        },
        pagination,
      );

      return travels;
    });
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(id, manager);

      const travel = await manager.findOne(Travel, {
        where: { id, company: { id: companyId } },
        relations: {
          company: true,
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
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  /* async cancel(
    id: number,
    office: Office,
    dto: CancelTravelDto,
    cashier: User,
  ) {
    const { password } = dto;

    const user = await this.userService.findOneByEmail(cashier.email);

    if (!user) {
      throw new UnauthorizedException('Cashier not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password Incorrecto');
    }

    return await this.dataSource.transaction(async (manager) => {
      await this.ticketExpirationService.expireTravelIfNeeded(id, manager);

      const travel = await manager.findOne(Travel, {
        where: {
          id,
          route: { officeOrigin: { company: { id: office.company.id } } },
        },
        relations: {
          tickets: {
            buyer: true,
          },
        },
      });

      if (!travel) throw new NotFoundException('Travel not found');

      if (travel.travel_status != TravelStatus.ACTIVE)
        throw new NotFoundException('The Travel is not active');

      try {
        travel.travel_status = TravelStatus.CANCELLED;

        return await manager.save(travel);
      } catch (error) {
        handleDBExceptions(error);
      }
    });
  } */

  async cancel(
    id: number,
    office: Office,
    dto: CancelTravelDto,
    cashier: User,
  ) {
    const { password } = dto;

    const user = await this.userService.findOneByEmail(cashier.email);

    if (!user) {
      throw new UnauthorizedException('Cashier not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Contraseña Incorrecto');
    }

    return await this.dataSource.transaction(async (manager) => {
      //! Expirar viaje si corresponde
      await this.ticketExpirationService.expireTravelIfNeeded(id, manager);

      //! Buscar viaje con tickets + buyers
      const travel = await manager.findOne(Travel, {
        where: {
          id,
          route: {
            officeOrigin: {
              company: { id: office.company.id },
            },
          },
        },
        relations: {
          tickets: {
            buyer: true,
            travelSeats: true,
          },
        },
      });

      if (!travel) {
        throw new NotFoundException('Travel not found');
      }

      if (travel.travel_status !== TravelStatus.ACTIVE) {
        throw new BadRequestException('The Travel is not active');
      }

      let cancelledTickets = 0;
      let refundedTickets = 0;

      //! Recorrer todos los tickets del viaje
      for (const ticket of travel.tickets) {
        //! Solo tickets cancelables
        if (
          ![
            TicketStatus.SOLD,
            TicketStatus.RESERVED,
            TicketStatus.PENDING_PAYMENT,
          ].includes(ticket.status)
        ) {
          continue;
        }

        //! ===============================
        //! Tickets comprados desde APP
        //! ===============================
        if (ticket.type === TicketType.IN_APP) {
          //! Refund wallet sin comisión
          if (ticket.status === TicketStatus.SOLD && ticket.buyer) {
            await this.walletService.creditFromTicketCancel(
              ticket,
              ticket.buyer,
              false,
              manager,
            );

            refundedTickets++;
          }

          //! Lógica equivalente a TicketsInAppService.applyCancelledState()
          ticket.reserve_expiresAt = null;

          if (
            ticket.status === TicketStatus.RESERVED ||
            ticket.status === TicketStatus.PENDING_PAYMENT
          ) {
            ticket.deletedAt = new Date();
          }

          for (const seat of ticket.travelSeats) {
            seat.status = SeatStatus.AVAILABLE;
            seat.ticket = null;
            seat.price = '0';
            seat.passenger = null;
          }

          ticket.status = TicketStatus.CANCELLED;
        }

        //! ===============================
        //! Tickets vendidos en oficina
        //! ===============================
        else if (ticket.type === TicketType.IN_OFFICE) {
          //! Lógica equivalente a TicketsForCashierService.applyCancelledState()
          const previousStatus = ticket.status;

          ticket.reserve_expiresAt = null;
          ticket.cancelledAt = new Date();
          ticket.canceledBy = cashier;
          ticket.status = TicketStatus.CANCELLED;

          if (
            previousStatus === TicketStatus.RESERVED ||
            previousStatus === TicketStatus.PENDING_PAYMENT
          ) {
            ticket.deletedAt = new Date();
          }

          for (const seat of ticket.travelSeats) {
            seat.status = SeatStatus.AVAILABLE;
            seat.ticket = null;
            seat.price = '0';
            seat.passenger = null;
          }
        }

        await manager.save(Ticket, ticket);

        cancelledTickets++;
      }

      //! Cancelar viaje
      travel.travel_status = TravelStatus.CANCELLED;

      await manager.save(Travel, travel);

      return {
        message: 'Travel canceled successfully',
        travelId: travel.id,
        cancelledTickets,
        refundedTickets,
      };
    });
  }

  //? ============================================================================================== */
  //?                                  Closed_Trips                                                  */
  //? ============================================================================================== */

  async closedTravelsReport(
    companyId: number,
    pagination: ReportPaginationDto,
  ) {
    const { startDate, endDate } = pagination;

    const where: any = {
      company: { id: companyId },
      travel_status: TravelStatus.CLOSED,
    };

    // --------------------------------
    // FILTROS DE FECHA (closedAt)
    // --------------------------------

    if (startDate && !endDate) {
      const start = new Date(`${startDate}T00:00:00-04:00`);
      const end = new Date(`${startDate}T23:59:59.999-04:00`);
      where.closedAt = Between(start, end);
    }

    if (startDate && endDate) {
      const from = new Date(`${startDate}T00:00:00-04:00`);
      const to = new Date(`${endDate}T23:59:59.999-04:00`);
      where.closedAt = Between(from, to);
    }

    const travels = await paginate(
      this.travelRepository,
      {
        where: {
          ...where,
        },
        order: { id: 'DESC' },
        relations: {
          closedBy: true,
        },
      },
      pagination,
    );

    return travels;
  }
}
