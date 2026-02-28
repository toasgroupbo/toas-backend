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
    let IdCorrelation: string;

    try {
      // ----------------------------------------------------------------
      // SOLO VALIDAR Y BLOQUEAR TICKET (NO CAMBIAR ESTADO)
      // ----------------------------------------------------------------

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

      // Generar correlación
      IdCorrelation = this.generateCorrelationId();

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // ----------------------------------------------------------------
    // LLAMAR AL BANCO (FUERA DE TRANSACCIÓN)
    // ----------------------------------------------------------------

    let result;

    try {
      result = await this.httpService.generateQr({
        IdCorrelation,
        expiration: this.formatExpirationForBcp(), // 00/HH:mm
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
    } catch (error) {
      //  Si el banco falla, el ticket sigue RESERVED
      return error;
      //throw new BadRequestException('QR generation failed. Please try again.');
    }

    // ----------------------------------------------------------------
    // SOLO SI EL BANCO RESPONDE OK → CAMBIAR ESTADOS
    // ----------------------------------------------------------------

    await this.dataSource.transaction(async (manager) => {
      const ticketToUpdate = await manager.findOne(Ticket, {
        where: { id: ticket.id },
        relations: { travelSeats: true },
      });

      if (!ticketToUpdate) {
        throw new NotFoundException('Ticket not found');
      }

      // Cambiar estados ahora sí
      ticketToUpdate.status = TicketStatus.PENDING_PAYMENT;
      ticketToUpdate.reserve_expiresAt = this.getReservationExpiryQr();

      for (const seat of ticketToUpdate.travelSeats) {
        seat.status = SeatStatus.PENDING_PAYMENT;
      }

      const paymentQr = manager.create(PaymentQR, {
        IdCorrelation,
        ticket: ticketToUpdate,
        qrImage: result.data.qrImage,
        amount: ticketToUpdate.total_price,
        qrId: result.data.id,
        expirationDate: result.data.expirationDate,
        state: result.state,
        message: result.message,
        status: PaymentStatusEnum.PENDING,
      });

      await manager.save(ticketToUpdate);
      await manager.save(paymentQr);
    });

    return result;
  }

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

  private formatExpirationForBcp(): string {
    const TWO_MINUTES = 2;
    const minutes = envs.RESERVATION_QR_EXPIRE_MINUTES - TWO_MINUTES;

    return `00/00:${minutes}`;
  }
}
