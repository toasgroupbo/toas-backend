import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

import { envs } from 'src/config/environments/environments';

import { SeatStatus } from 'src/common/enums';
import { TicketType } from '../tickets/enums';
import { PaymentType } from '../tickets/enums/payment-type.enum';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';

import { GenerateQrDto } from './dto/generate-qr.dto';

import { QrCallbackResponse } from './interfaces/qr-callback-response.interface';
import { QrGenerateResponse } from './interfaces/qr-generate-response.interface';

import { HttpService } from './http/http.service';
import { WalletService } from '../wallet/wallet.service';
import { TicketsService } from '../tickets/tickets.service';

import { Ticket } from '../tickets/entities/ticket.entity';
import { PaymentQR, PaymentStatusEnum } from './entities/payment-qr.entity';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly ticketsService: TicketsService,
    private readonly walletService: WalletService,
    private dataSource: DataSource,
  ) {}

  //? ============================================================================================== */
  //?                                   Generate_QR                                                  */
  //? ============================================================================================== */

  /*  async generateQr(dto: GenerateQrDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let ticket: Ticket | null;
    let IdCorrelation: string;

    let walletUsed = 0;
    let qrAmount = 0;
    let shouldGenerateQr = true; // Por defecto generamos QR

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

      const totalPrice = Number(ticket.total_price);

      if (ticket.type === TicketType.IN_APP) {
        // Intentar consumir wallet (FIFO)
        walletUsed = await this.walletService.consumeForTicket(
          ticket.buyer,
          ticket,
          totalPrice,
          queryRunner.manager,
        );

        qrAmount = totalPrice - walletUsed;

        // Actualizar ticket con los montos
        await queryRunner.manager.update(Ticket, ticket.id, {
          wallet_used: walletUsed.toFixed(2),
          qr_amount: qrAmount.toFixed(2),
        });

        ticket.wallet_used = walletUsed.toFixed(2);
        ticket.qr_amount = qrAmount.toFixed(2);

        // ============================================================
        // SI LA WALLET CUBRIÓ TODO, MARCAR COMO SOLD Y NO GENERAR QR
        // ============================================================
        if (qrAmount === 0) {
          await queryRunner.manager.update(Ticket, ticket.id, {
            status: TicketStatus.SOLD,
          });
          ticket.status = TicketStatus.SOLD;
          shouldGenerateQr = false; // No generamos QR
        }
      } else {
        qrAmount = totalPrice; // El QR es por el total
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

    if (!shouldGenerateQr) {
      return {
        message: 'Ticket paid successfully with wallet',
        ticketId: ticket.id,
        walletUsed,
        qrAmount: 0,
        status: TicketStatus.SOLD,
      };
    }

    // ----------------------------------------------------------------
    // LLAMAR AL BANCO (FUERA DE TRANSACCIÓN)
    // ----------------------------------------------------------------

    let result: QrGenerateResponse;

    try {
      result = await this.httpService.generateQr({
        IdCorrelation,
        expiration: this.formatExpirationForBcp(), // 00/HH:mm
        amount:
          Number(ticket.qr_amount) +
          Number(ticket.commission),
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
      throw new BadRequestException('QR generation failed. Please try again.');
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
        amount:
          ticketToUpdate.type === TicketType.IN_APP
            ? ticketToUpdate.qr_amount // Solo lo que falta pagar
            : ticketToUpdate.total_price, // Ticket de oficina: el total
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
  } */

  async generateQr(dto: GenerateQrDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let ticket: Ticket | null;
    let IdCorrelation: string;

    let walletUsed = 0;
    let qrAmount = 0;
    let shouldGenerateQr = true;

    try {
      ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .innerJoinAndSelect('ticket.travelSeats', 'travelSeats')
        .innerJoinAndSelect('ticket.buyer', 'buyer')
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

      const totalPrice = Number(ticket.total_price);

      if (ticket.type === TicketType.IN_APP && ticket.buyer) {
        walletUsed = await this.walletService.consumeForTicket(
          ticket.buyer,
          ticket,
          totalPrice,
          queryRunner.manager,
        );

        qrAmount = totalPrice - walletUsed;

        await queryRunner.manager.update(Ticket, ticket.id, {
          wallet_used: walletUsed.toFixed(2),
          qr_amount: qrAmount.toFixed(2),
        });

        ticket.wallet_used = walletUsed.toFixed(2);
        ticket.qr_amount = qrAmount.toFixed(2);

        if (qrAmount === 0) {
          await queryRunner.manager.update(Ticket, ticket.id, {
            status: TicketStatus.SOLD,
          });
          ticket.status = TicketStatus.SOLD;
          shouldGenerateQr = false;
        }
      } else {
        qrAmount = totalPrice;
      }

      IdCorrelation = this.generateCorrelationId();
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (!shouldGenerateQr) {
      return {
        message: 'Ticket paid successfully with wallet',
        ticketId: ticket.id,
        walletUsed,
        qrAmount: 0,
        status: TicketStatus.SOLD,
      };
    }

    let result: QrGenerateResponse;

    try {
      result = await this.httpService.generateQr({
        IdCorrelation,
        expiration: this.formatExpirationForBcp(),
        amount: Number(ticket.qr_amount) + Number(ticket.commission),
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
      throw new BadRequestException('QR generation failed. Please try again.');
    }

    await this.dataSource.transaction(async (manager) => {
      const ticketToUpdate = await manager.findOne(Ticket, {
        where: { id: ticket.id },
        relations: { travelSeats: true },
      });

      if (!ticketToUpdate) {
        throw new NotFoundException('Ticket not found');
      }

      ticketToUpdate.status = TicketStatus.PENDING_PAYMENT;
      ticketToUpdate.reserve_expiresAt = this.getReservationExpiryQr();

      for (const seat of ticketToUpdate.travelSeats) {
        seat.status = SeatStatus.PENDING_PAYMENT;
      }

      const paymentQr = manager.create(PaymentQR, {
        IdCorrelation,
        ticket: ticketToUpdate,
        qrImage: result.data.qrImage,
        amount:
          ticketToUpdate.type === TicketType.IN_APP
            ? ticketToUpdate.qr_amount // ← MEJORADO
            : ticketToUpdate.total_price,
        qrId: result.data.id,
        expirationDate: result.data.expirationDate,
        state: result.state,
        message: result.message,
        status: PaymentStatusEnum.PENDING,
      });

      await manager.save(ticketToUpdate);
      await manager.save(paymentQr);
    });

    return {
      ...result,
      reserve_expiresAt: ticket.reserve_expiresAt,
      walletUsed,
      qrAmount,
    };
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paymentQr = await queryRunner.manager.findOne(PaymentQR, {
        where: { IdCorrelation: CorrelationId },
        relations: { ticket: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!paymentQr) {
        await queryRunner.rollbackTransaction();
        return;
      }

      //  Idempotencia básica (evita doble callback)
      if (paymentQr.status === PaymentStatusEnum.PAID) {
        await queryRunner.rollbackTransaction();
        return;
      }

      // Guardar respuesta del banco
      paymentQr.data = dto;
      paymentQr.status = PaymentStatusEnum.PAID;

      await queryRunner.manager.save(paymentQr);

      // Confirmar ticket
      if (paymentQr.ticket) {
        await this.ticketsService.confirmWithManager(
          paymentQr.ticket.id,
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
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
