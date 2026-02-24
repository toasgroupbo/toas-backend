import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { envs } from 'src/config/environments/environments';

import { GenerateQrDto } from './dto/generate-qr.dto';

import { QrCallbackResponse } from './interfaces/qr-callback-response.interface';

import { SeatStatus } from 'src/common/enums';
import { PaymentStatusEnum } from './enum/payment-status.enum';
import { PaymentType } from '../tickets/enums/payment-type.enum';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';

import { HttpService } from './http/http.service';
import { TicketsService } from '../tickets/tickets.service';

import { PaymentQR } from './entities/payment-qr.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentQR)
    private readonly paymentRepository: Repository<PaymentQR>,

    private readonly httpService: HttpService,
    private dataSource: DataSource,

    private readonly ticketsService: TicketsService,
  ) {}

  //? ============================================================================================== */
  //?                                   Generate_QR                                                  */
  //? ============================================================================================== */

  async generateQr(dto: GenerateQrDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let ticket: Ticket | null;
    let expirationForBcp: string;
    let IdCorrelation: string;

    try {
      ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .setLock('pessimistic_write')
        .where('ticket.id = :ticketId', { ticketId: dto.ticketId })
        .andWhere('ticket.status = :status', {
          status: TicketStatus.RESERVED,
        })
        .andWhere('ticket.payment_type = :paymentType', {
          paymentType: PaymentType.QR,
        })
        .andWhere(
          '(ticket.reserve_expiresAt IS NULL OR ticket.reserve_expiresAt > NOW())',
        )
        .getOne();

      if (!ticket) {
        throw new BadRequestException('Ticket not available for QR generation');
      }

      const expires = this.getReservationExpiryQr();
      ticket.status = TicketStatus.PENDING_PAYMENT;
      ticket.reserve_expiresAt = expires;

      for (const travelSeat of ticket.travelSeats) {
        travelSeat.status = SeatStatus.PENDING_PAYMENT;
      }

      await queryRunner.manager.save(ticket);

      expirationForBcp = this.formatExpirationForBcp(ticket.reserve_expiresAt);

      IdCorrelation = this.generateCorrelationId();

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    //  AQUÍ YA NO HAY TRANSACCIÓN ABIERTA
    const result = await this.httpService.generateQr({
      IdCorrelation,
      expiration: expirationForBcp,
      amount: Number(ticket.total_price) + Number(ticket.commission),
      gloss: dto.gloss,
      collectors: [
        {
          name: 'Ticket',
          parameter: 'TicketId',
          value: ticket.id.toString(),
        },
      ],
    });

    // Nueva transacción corta solo para guardar el QR
    await this.dataSource.transaction(async (manager) => {
      const paymentQr = manager.create(PaymentQR, {
        IdCorrelation,
        ticket,
        qrImage: result.data.qrImage,
        amount: ticket.total_price,
        qrId: result.data.id,
        expirationDate: result.data.expirationDate,
        state: result.state,
        message: result.message,
        status: PaymentStatusEnum.PENDING,
      });

      await manager.save(paymentQr);
    });

    return result;
  }

  /* async generateQr(dto: GenerateQrDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --------------------------------------------
      // 1 Buscar ticket con lock
      // --------------------------------------------

      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .setLock('pessimistic_write')
        .where('ticket.id = :ticketId', { ticketId: dto.ticketId })
        .andWhere('ticket.status = :status', {
          status: TicketStatus.RESERVED,
        })
        .andWhere('ticket.payment_type = :paymentType', {
          paymentType: PaymentType.QR,
        })
        .andWhere(
          '(ticket.reserve_expiresAt IS NULL OR ticket.reserve_expiresAt > NOW())',
        )
        .getOne();

      if (!ticket) {
        throw new BadRequestException('Ticket not available for QR generation');
      }

      // --------------------------------------------
      // 2 Cambiar estados y cambiar el expire
      // --------------------------------------------

      const expires = this.getReservationExpiryQr();
      ticket.status = TicketStatus.PENDING_PAYMENT;
      ticket.reserve_expiresAt = expires;

      for (const travelSeat of ticket.travelSeats) {
        travelSeat.status = SeatStatus.PENDING_PAYMENT;
      }

      await queryRunner.manager.save(ticket);

      const expirationForBcp = this.formatExpirationForBcp(
        ticket.reserve_expiresAt,
      );

      // --------------------------------------------
      // 3 Hacer la peticion al BCP
      // --------------------------------------------

      const IdCorrelation = this.generateCorrelationId();

      const result = await this.httpService.generateQr({
        IdCorrelation: IdCorrelation,
        expiration: expirationForBcp,
        amount: Number(ticket.total_price) + Number(ticket.commission), //! + la comision
        gloss: dto.gloss,
        collectors: [
          {
            name: 'Ticket',
            parameter: 'TicketId',
            value: ticket.id.toString(),
          },
        ],
      });

      // --------------------------------------------
      // 4 Guardar el Payment QR
      // --------------------------------------------

      const paymentQr = queryRunner.manager.create(PaymentQR, {
        IdCorrelation: IdCorrelation,
        ticket: ticket,
        qrImage: result.data.qrImage,
        amount: ticket.total_price,
        qrId: result.data.id,
        expirationDate: result.data.expirationDate,
        state: result.state,
        message: result.message,
        status: PaymentStatusEnum.PENDING,
      });
      await queryRunner.manager.save(paymentQr);

      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      return {
        success: false,
        state: error.state || '99',
        message: error.message || 'Error generando QR',
        details: error.details,
      };
    }
  } */

  //? ============================================================================================== */
  //?                                    Verify_QR                                                   */
  //? ============================================================================================== */

  async verifyQr(ticketId: number) {
    return await this.ticketsService.verifyQr(ticketId);
  }

  //? ============================================================================================== */
  //?                                      CallBack                                                  */
  //? ============================================================================================== */

  async callback(dto: QrCallbackResponse) {
    const { CorrelationId } = dto;

    const paymentQr = await this.paymentRepository.findOne({
      where: { IdCorrelation: CorrelationId },
      relations: { ticket: true },
    });

    if (paymentQr) {
      paymentQr.data = dto;
      paymentQr.status = PaymentStatusEnum.PAID;
      await this.paymentRepository.save(paymentQr);

      try {
        if (paymentQr.ticket) {
          await this.ticketsService.confirm(paymentQr.ticket.id);
        }
      } catch (err) {
        console.error('Error confirming ticket after payment callback', err);
      }
    }
  }

  //* ============================================================================================== */

  private generateCorrelationId(): string {
    return randomUUID();
  }
  //* ============================================================================================== */

  private getReservationExpiryQr(): Date {
    const minutes = envs.RESERVATION_QR_EXPIRE_MINUTES || 10;
    const now = new Date();
    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  //* ============================================================================================== */

  private formatExpirationForBcp(ticketExpireDate: Date): string {
    const TWO_MINUTES = 2 * 60 * 1000;

    // Restar 2 minutos
    const qrExpire = new Date(ticketExpireDate.getTime() - TWO_MINUTES);

    const day = String(qrExpire.getDate()).padStart(2, '0');
    const hours = String(qrExpire.getHours()).padStart(2, '0');
    const minutes = String(qrExpire.getMinutes()).padStart(2, '0');

    return `${day}/${hours}:${minutes}`;
  }
}
