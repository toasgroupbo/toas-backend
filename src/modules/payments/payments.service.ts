import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { envs } from 'src/config/environments/environments';

import { SeatStatus } from 'src/common/enums';
import { TicketType } from '../tickets/enums';
import { PaymentType } from '../tickets/enums/payment-type.enum';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';

import { GenerateQrDto } from './dto/generate-qr.dto';
import { GenerateWalletForRechargeDto } from './dto/recharge-qr.dto';

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
    @InjectRepository(PaymentQR)
    private readonly paymentQrRepository: Repository<PaymentQR>,

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

      const ticketWithoutRelations = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
        .setLock('pessimistic_write')
        .where('ticket.id = :ticketId', { ticketId: Number(dto.ticketId) })
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

      if (!ticketWithoutRelations) {
        throw new BadRequestException('Ticket not available for QR generation');
      }

      ticket = await queryRunner.manager.findOne(Ticket, {
        where: { id: ticketWithoutRelations.id },
        relations: { travelSeats: true, buyer: true },
      });

      if (!ticket) {
        throw new BadRequestException('Ticket not available for QR generation');
      }

      IdCorrelation = `TICKET-${ticket.id}-${randomUUID().slice(0, 8)}`;

      //! wallet

      if (
        Number(ticket.wallet_amount) > 0 &&
        ticket.type == TicketType.IN_APP &&
        ticket.buyer
      ) {
        await this.walletService.consumeForTicket({
          customer: ticket.buyer,
          ticket,
          amount: Number(ticket.wallet_amount),
          manager: queryRunner.manager,
        });
      }

      if (Number(ticket.qr_amount) === 0) {
        await this.ticketsService.confirmWithManager(
          ticket,
          queryRunner.manager,
        );

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

    try {
      result = await this.httpService.generateQr({
        IdCorrelation,
        expiration: this.formatExpirationForBcp(),
        amount, // amount: 0.01, //! para pruebas
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
      if (ticket.buyer) {
        await this.dataSource.transaction(async (manager) => {
          await this.walletService.restoreCreditsFromExpiredTicket(
            ticket,
            ticket.buyer!,
            manager,
          );
        });
      }

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

  async generateQrForRecharge(dto: GenerateWalletForRechargeDto) {
    const customers: Customer[] = [];

    for (const customerId of dto.customerIds) {
      const customer = await this.dataSource.manager.findOne(Customer, {
        where: { id: customerId },
      });

      if (!customer) {
        throw new BadRequestException(
          `Customer with ID ${customerId} not found`,
        );
      }
      customers.push(customer);
    }

    const totalAmount = dto.amountPerCustomer * dto.customerIds.length;
    const IdCorrelation = `RECHARGE-${randomUUID().slice(0, 8)}`;

    // Construir collectors: uno por cada cliente
    const collectors = [
      {
        name: QrPaymentTypeEnum.WALLET_RECHARGE,
        parameter: 'RechargeType',
        value: 'MULTIPLE',
      },
      // Un collector por cada cliente
      ...customers.map((customer, index) => ({
        name: 'CUSTOMER_RECHARGE',
        parameter: `customer_${customer.id}`,
        value: JSON.stringify({
          customerId: customer.id,
          amount: dto.amountPerCustomer,
          index: index,
        }),
      })),
    ];

    let result: QrGenerateResponse;

    try {
      result = await this.httpService.generateQr({
        IdCorrelation,
        expiration: this.formatExpirationForBcp(),
        amount: totalAmount, // amount: 0.01, //! para pruebas
        gloss: `Recarga para ${dto.customerIds.length} cliente(s)`,
        collectors: collectors,
      });
    } catch (error) {
      throw new BadRequestException('QR generation failed. Please try again.');
    }

    // Guardar PaymentQR con metadata de customers
    await this.dataSource.transaction(async (manager) => {
      const paymentQrRepo = manager.getRepository(PaymentQR);

      const paymentQr = paymentQrRepo.create({
        IdCorrelation,
        qrImage: result.data.qrImage,
        amount: totalAmount.toString(),
        qrId: result.data.id,
        expirationDate: result.data.expirationDate,
        state: result.state,
        message: result.message,

        status: PaymentStatusEnum.PENDING,
        payment_type: QrPaymentTypeEnum.WALLET_RECHARGE,
      });
      await paymentQrRepo.save(paymentQr);
    });

    return {
      message: `QR generado para recarga de ${dto.customerIds.length} cliente(s)`,
      qrImage: result.data.qrImage,
      expiresAt: result.data.expirationDate,
      totalAmount,
      amountPerCustomer: dto.amountPerCustomer,
      customerIds: dto.customerIds,
      correlationId: IdCorrelation,
    };
  }

  //? ============================================================================================== */
  //?                                    Verify_QR                                                   */
  //? ============================================================================================== */

  async verifyQr(ticketId: number) {
    return await this.ticketsService.verifyQr(ticketId);
  }

  async verifyRechargeQr(IdCorrelation: string) {
    const paymentQr = await this.paymentQrRepository.findOne({
      where: { IdCorrelation },
    });

    if (!paymentQr) {
      throw new NotFoundException(
        `Payment QR with ID ${IdCorrelation} not found`,
      );
    }

    return { status: paymentQr.status };
  }

  //? ============================================================================================== */
  //?                                      CallBack                                                  */
  //? ============================================================================================== */

  async callback(dto: QrCallbackResponse) {
    const { CorrelationId, Collectors } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paymentQr = await queryRunner.manager.findOne(PaymentQR, {
        where: { IdCorrelation: CorrelationId },
        relations: {
          ticket: { buyer: true, travelSeats: true },
        },
      });

      if (!paymentQr) {
        await queryRunner.rollbackTransaction();
        return;
      }

      if (paymentQr.status === PaymentStatusEnum.PAID) {
        await queryRunner.commitTransaction();
        return;
      }

      // El ticket fue cancelado por el cliente antes de que el banco confirmara
      // el pago: se ignora la confirmación para no revivir un ticket cancelado.
      if (paymentQr.status === PaymentStatusEnum.CANCELLED) {
        await queryRunner.commitTransaction();
        return;
      }

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
        if (paymentQr.ticket) {
          await this.ticketsService.confirmWithManager(
            paymentQr.ticket,
            queryRunner.manager,
          );
        }
      } else if (rechargeCollector) {
        // Buscar TODOS los collectors de tipo CUSTOMER_RECHARGE
        const customerRechargeCollectors = Collectors?.filter(
          (c) => c.Name === 'CUSTOMER_RECHARGE',
        );

        if (
          !customerRechargeCollectors ||
          customerRechargeCollectors.length === 0
        ) {
          await queryRunner.rollbackTransaction();
          return;
        }

        const results: any[] = [];

        // Procesar cada collector (cada cliente)
        for (const collector of customerRechargeCollectors) {
          let customerData;
          try {
            customerData = JSON.parse(collector.Value);
          } catch (error) {
            results.push({
              collector: collector.Parameter,
              success: false,
              error: 'Invalid collector data format',
            });
            continue;
          }

          const { customerId, amount } = customerData;

          // Buscar el cliente
          const customer = await queryRunner.manager.findOne(Customer, {
            where: { id: customerId },
          });

          if (!customer) {
            results.push({
              customerId,
              success: false,
              error: 'Customer not found',
            });
            continue;
          }

          try {
            // Crear la transacción de crédito para este cliente
            const transaction = await this.walletService.creditFromRecharge({
              customer,
              amount: amount,
              correlationId: paymentQr.IdCorrelation,
              paymentData: dto,
              manager: queryRunner.manager,
              paymentQr: paymentQr,
            });

            results.push({
              customerId,
              success: true,
              transactionId: transaction.id,
              amount: amount,
            });
          } catch (error) {
            results.push({
              customerId,
              success: false,
              error: error.message,
            });
          }
        }

        // Opcional: Si algún cliente falló, loguear pero no hacer rollback
        /* const failedResults = results.filter((r) => !r.success);
        if (failedResults.length > 0) {
          console.error('Failed recharges:', failedResults);
        } */
      }

      paymentQr.data = dto;
      paymentQr.status = PaymentStatusEnum.PAID;
      await queryRunner.manager.save(paymentQr);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
