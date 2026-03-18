import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

import { envs } from 'src/config/environments/environments';

import { SeatStatus } from 'src/common/enums';
import { PaymentType } from '../tickets/enums/payment-type.enum';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';

import { GenerateQrDto } from './dto/generate-qr.dto';

import { QrCallbackResponse } from './interfaces/qr-callback-response.interface';
import { QrGenerateResponse } from './interfaces/qr-generate-response.interface';

import { HttpService } from './http/http.service';
import { WalletService } from '../wallet/wallet.service';
import { TicketsService } from '../tickets/tickets.service';

import {
  PaymentQR,
  PaymentStatusEnum,
  QrPaymentTypeEnum,
} from './entities/payment-qr.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Customer } from '../customers/entities/customer.entity';

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

  async generateQr(dto: GenerateQrDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let ticket: Ticket | null;
    let IdCorrelation: string;

    try {
      // 1. Validar y bloquear ticket
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
        //! wallet
        //.andWhere('ticket.qr_amount > 0')
        //! wallet
        .andWhere(
          '(ticket.reserve_expiresAt IS NULL OR ticket.reserve_expiresAt > NOW())',
        )
        .getOne();

      if (!ticket) {
        throw new BadRequestException('Ticket not available for QR generation');
      }

      IdCorrelation = `TICKET-${Date.now()}-${ticket.id}-${randomUUID()}`;

      //! wallet
      const walletAmount = Number(ticket.wallet_amount);

      if (walletAmount > 0) {
        await this.walletService.consumeForTicket({
          customer: ticket.buyer,
          ticket,
          amount: walletAmount,
          manager: queryRunner.manager,
        });
      }

      const qrAmount = Number(ticket.qr_amount);

      if (qrAmount === 0) {
        await queryRunner.manager.update(Ticket, ticket.id, {
          status: TicketStatus.SOLD,
          reserve_expiresAt: null,
        });

        for (const seat of ticket.travelSeats) {
          seat.status = SeatStatus.SOLD;
          await queryRunner.manager.save(seat);
        }
        await queryRunner.commitTransaction();
        return {
          message: 'Ticket paid fully with wallet',
          status: TicketStatus.SOLD,
          ticketId: ticket,
        };
      }

      //! wallet

      // 2. NO hacer commit todavía, esperamos al QR
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // ============================================================
    // 3. LLAMAR AL BANCO (FUERA DE TRANSACCIÓN)
    // ============================================================

    let result: QrGenerateResponse;
    const amount = Number(ticket.qr_amount);
    //const amount = Number(ticket.total_price) + Number(ticket.commission);

    try {
      result = await this.httpService.generateQr({
        IdCorrelation,
        expiration: this.formatExpirationForBcp(),
        amount: 0.01, //! para pruebas
        gloss: dto.gloss,
        collectors: [
          {
            name: QrPaymentTypeEnum.TICKET,
            parameter: 'TicketId',
            value: ticket.id.toString(),
          },
        ],
      });
    } catch (error) {
      //await this.walletService.restoreCreditsFromExpiredTicket(ticket);

      await this.dataSource.transaction(async (manager) => {
        await this.walletService.restoreCreditsFromExpiredTicket(
          ticket,
          manager,
        );
      });
      throw new BadRequestException('QR generation failed. Please try again.');
    }

    // ============================================================
    // 4. GUARDAR PAYMENTQR Y ACTUALIZAR TICKET (NUEVA TRANSACCIÓN)
    // ============================================================

    await this.dataSource.transaction(async (manager) => {
      // 4.1 Actualizar ticket
      await manager.update(Ticket, ticket.id, {
        status: TicketStatus.PENDING_PAYMENT,
        reserve_expiresAt: this.getReservationExpiryQr(),
      });

      // 4.2 Actualizar asientos
      for (const seat of ticket.travelSeats) {
        seat.status = SeatStatus.PENDING_PAYMENT;
        await manager.save(seat);
      }

      // 4.3 Crear PaymentQR
      const paymentQr = manager.create(PaymentQR, {
        IdCorrelation,
        ticket: ticket,
        qrImage: result.data.qrImage,
        amount: amount.toString(),
        qrId: result.data.id,
        expirationDate: result.data.expirationDate,
        state: result.state,
        message: result.message,

        status: PaymentStatusEnum.PENDING,
        payment_type: QrPaymentTypeEnum.TICKET,
      });

      await manager.save(paymentQr);
    });

    return {
      ...result,
      ticketId: ticket.id,
      status: TicketStatus.PENDING_PAYMENT,
      reserve_expiresAt: this.getReservationExpiryQr(),
    };
  }

  //? ============================================================================================== */
  //?                          Generate_QR_Recharge                                                  */
  //? ============================================================================================== */

  async generateQrForRecharge(customer: Customer, amount: number) {
    const IdCorrelation = `RECHARGE-${Date.now()}-${customer.id}-${randomUUID()}`;
    let result: QrGenerateResponse;

    try {
      result = await this.httpService.generateQr({
        IdCorrelation,
        expiration: this.formatExpirationForBcp(),
        amount,
        gloss: `Recarga de wallet para ${customer.email || customer.name}`,
        collectors: [
          {
            name: QrPaymentTypeEnum.WALLET_RECHARGE,
            parameter: 'CustomerId',
            value: customer.id.toString(),
          },
        ],
      });
    } catch (error) {
      throw new BadRequestException('QR generation failed. Please try again.');
    }

    // 4. Guardar PaymentQR (con relación a customer)
    await this.dataSource.transaction(async (manager) => {
      const paymentQrRepo = manager.getRepository(PaymentQR);

      const newPaymentQr = paymentQrRepo.create({
        IdCorrelation,
        qrImage: result.data.qrImage,
        amount: amount.toString(),
        qrId: result.data.id,
        expirationDate: result.data.expirationDate,
        state: result.state,
        message: result.message,
        status: PaymentStatusEnum.PENDING,
        payment_type: QrPaymentTypeEnum.WALLET_RECHARGE,
      });

      return await paymentQrRepo.save(newPaymentQr);
    });

    return {
      message: 'QR generado para recarga de wallet',
      qrImage: result.data.qrImage,
      expiresAt: result.data.expirationDate,
      amount,
      correlationId: IdCorrelation,
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
    const { CorrelationId, Collectors } = dto;

    console.log(dto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paymentQr = await queryRunner.manager.findOne(PaymentQR, {
        where: { IdCorrelation: CorrelationId },
        relations: {
          ticket: true,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!paymentQr) {
        await queryRunner.rollbackTransaction();
        return;
      }

      if (paymentQr.status === PaymentStatusEnum.PAID) {
        await queryRunner.rollbackTransaction();
        return;
      }

      paymentQr.data = dto;
      paymentQr.status = PaymentStatusEnum.PAID;
      await queryRunner.manager.save(paymentQr);

      // ============================================================
      // IDENTIFICAR EL TIPO POR EL COLLECTOR
      // ============================================================

      const ticketCollector = Collectors?.find(
        (c) => c.Name === QrPaymentTypeEnum.TICKET,
      );
      const rechargeCollector = Collectors?.find(
        (c) => c.Name === QrPaymentTypeEnum.WALLET_RECHARGE,
      );

      if (ticketCollector) {
        // Es un pago de ticket
        const ticketId = parseInt(ticketCollector.Value);

        // Buscar el ticket (usando el ID del collector)
        const ticket = await queryRunner.manager.findOne(Ticket, {
          where: { id: ticketId },
        });

        if (ticket) {
          await this.ticketsService.confirmWithManager(
            ticket.id,
            queryRunner.manager,
          );
        }
      } else if (rechargeCollector) {
        // Es una recarga de wallet
        const customerId = parseInt(rechargeCollector.Value);

        // Buscar el customer usando el ID del collector
        const customer = await queryRunner.manager.findOne(Customer, {
          where: { id: customerId },
        });

        if (customer) {
          const transaction = await this.walletService.creditFromRecharge({
            customer,
            amount: Number(paymentQr.amount),
            correlationId: paymentQr.IdCorrelation,
            paymentData: dto,
            manager: queryRunner.manager,
            paymentQr,
          });

          // Asociar la transacción al PaymentQR
          paymentQr.walletTransaction = transaction;
          await queryRunner.manager.save(paymentQr);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /*  const { CorrelationId } = dto;

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
    } */

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
