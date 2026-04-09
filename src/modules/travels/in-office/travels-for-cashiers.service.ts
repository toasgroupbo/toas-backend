import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { TravelForCashierFilterDto } from '../pagination';

import { TravelStatus } from '../enums';
import { SeatStatus } from 'src/common/enums';
import { TicketStatus } from '../../tickets/enums/ticket-status.enum';

import { TicketExpirationService } from '../../tickets/ticket-expiration.service';

import { Travel } from '../entities/travel.entity';
import { User } from '../../users/entities/user.entity';
import { TravelSeat } from '../entities/travel-seat.entity';
import { Office } from '../../offices/entities/office.entity';
import { PaymentType } from 'src/modules/tickets/enums';

@Injectable()
export class TravelsForCashierService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    private readonly ticketExpirationService: TicketExpirationService,
    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(filters: TravelForCashierFilterDto, office: Office) {
    const { destination_placeId, departure_time } = filters;

    const where: any = {
      travel_status: In([TravelStatus.ACTIVE, TravelStatus.CLOSED]),
      enabled: true,
      route: {
        officeOrigin: {
          id: office.id,
        },
      },
    };

    if (destination_placeId) {
      where.route.officeDestination = {
        place: {
          id: destination_placeId,
        },
      };
    }

    if (departure_time) {
      const start = new Date(`${departure_time}T00:00:00-04:00`);
      const end = new Date(`${departure_time}T23:59:59.999-04:00`);

      where.departure_time = Between(start, end);
    }

    const travels = await this.travelRepository.find({
      where,
      order: {
        departure_time: 'ASC',
      },
      relations: {
        bus: true,
        route: {
          officeOrigin: { place: true },
          officeDestination: { place: true },
        },
      },
    });

    const travelsWithSeats = await Promise.all(
      travels.map(async (travel) => {
        const seatsAvailable = await this.getSeatsAvailableCount(travel.id);
        return {
          ...travel,
          seatsAvailable,
        };
      }),
    );

    return travelsWithSeats;
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

      // --------------------------------------------
      // 3. CALCULAR MONTOS (CORREGIDO)
      // --------------------------------------------
      let total = 0; // Suma de total_price de tickets SOLD
      let qr_amount = 0; // Suma de total_price de tickets SOLD con QR
      let total_commission = 0; // Suma de commission de tickets SOLD con QR
      let cash_amount = 0; // Suma de tickets SOLD con payment_type = CASH
      let sold_tickets_count = 0; // Contador de tickets vendidos

      for (const ticket of travel.tickets) {
        // Solo considerar tickets SOLD
        if (ticket.status === TicketStatus.SOLD) {
          const price = Number(ticket.total_price);
          const commission = Number(ticket.commission);

          total += price;
          sold_tickets_count++;

          // Sumar por método de pago
          if (ticket.payment_type === PaymentType.CASH) {
            cash_amount += price;
            // CASH: no se suma a qr_amount ni a commission
          } else if (ticket.payment_type === PaymentType.QR) {
            qr_amount =
              qr_amount +
              Number(ticket.qr_amount) +
              Number(ticket.wallet_amount); // price
            total_commission += commission;
          }
        }
      }

      // net_to_company = SOLO lo que se pagó con QR menos la comisión
      const net_to_company = qr_amount - total_commission;

      // --------------------------------------------
      // 4. GUARDAR MONTOS EN EL TRAVEL
      // --------------------------------------------

      travel.total = total.toString();
      travel.qr_amount = qr_amount.toString();
      travel.cash_amount = cash_amount.toString();
      travel.total_commission = total_commission.toString();
      travel.net_to_company = net_to_company.toString();
      travel.sold_tickets_count = sold_tickets_count;

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

  /* async close(travelId: number, cashier: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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

      // --------------------------------------------
      // 3. Calcular montos
      // --------------------------------------------
      let total = 0; // Suma de total_price de tickets SOLD
      let total_commission = 0; // Suma de commission de tickets SOLD
      let cash_amount = 0; // Suma de tickets SOLD con payment_type = CASH
      let qr_amount = 0; // Suma de tickets SOLD con payment_type = QR
      let sold_tickets_count = 0; // Contador de tickets vendidos

      for (const ticket of travel.tickets) {
        // Solo considerar tickets SOLD
        if (ticket.status === TicketStatus.SOLD) {
          const price = Number(ticket.total_price);
          const commission = Number(ticket.commission);

          total += price;
          total_commission += commission;
          sold_tickets_count++;

          // Sumar por método de pago
          if (ticket.payment_type === PaymentType.CASH) {
            cash_amount += price;
          } else if (ticket.payment_type === PaymentType.QR) {
            qr_amount += price;
          }
        }
      }

      const net_to_company = total - total_commission;

      // --------------------------------------------
      // 4. Guardar montos en el travel
      // --------------------------------------------
      travel.total = total.toString();
      travel.total_commission = total_commission.toString();
      travel.net_to_company = net_to_company.toString();
      travel.cash_amount = cash_amount.toString();
      travel.qr_amount = qr_amount.toString();
      travel.sold_tickets_count = sold_tickets_count;

      // --------------------------------------------
      // 5. Cerrar viaje
      // --------------------------------------------
      travel.travel_status = TravelStatus.CLOSED;
      travel.closedAt = new Date();
      travel.closedBy = cashier;

      const now = new Date();

      // --------------------------------------------
      // 6. Procesar tickets (RESERVED)
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
      // 7. Procesar asientos
      // --------------------------------------------
      for (const seat of travel.travelSeats) {
        if (seat.status !== SeatStatus.SOLD) {
          seat.status = SeatStatus.UNSOLD;
          seat.price = '0';
          seat.ticket = null;
        }
      }

      // --------------------------------------------
      // 8. Persistir cambios
      // --------------------------------------------
      await queryRunner.manager.save(travel);
      await queryRunner.manager.save(travel.tickets);
      await queryRunner.manager.save(travel.travelSeats);

      await queryRunner.commitTransaction();

      return {
        message: 'Travel closed successfully',
        travel: travel,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  } */
}
