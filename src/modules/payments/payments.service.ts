import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { GenerateQrDto } from './dto/generate-qr.dto';

import { HttpService } from './http/http.service';
import { TicketsService } from '../tickets/tickets.service';

import { PaymentQR } from './entities/payment-qr.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { PaymentType } from '../tickets/enums/payment-type.enum';
import { envs } from 'src/config/environments/environments';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentQR)
    private readonly paymentRepository: Repository<PaymentQR>,

    private readonly httpService: HttpService,

    private readonly ticketsService: TicketsService,

    private dataSource: DataSource,
  ) {}

  async generateQr(dto: GenerateQrDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --------------------------------------------
      // 1 Buscar ticket con lock
      // --------------------------------------------

      const ticket = await queryRunner.manager
        .createQueryBuilder(Ticket, 'ticket')
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

      await queryRunner.manager.save(ticket);

      // --------------------------------------------
      // 3 Hacer la peticion al BCP
      // --------------------------------------------

      const result = await this.httpService.generateQr({
        amount: +ticket.total_price,
        gloss: dto.gloss,
        collectors: [
          {
            name: 'TicketId',
            parameter: 'Ticket',
            value: ticket.id.toString(),
          },
        ],
      });

      // --------------------------------------------
      // 4 Guardar el Payment QR
      // --------------------------------------------

      const paymentQr = queryRunner.manager.create(PaymentQR, {
        ticket: ticket,
        qrImage: result.data.qrImage,
        amount: ticket.total_price,
        qrId: result.data.id,
        expirationDate: result.data.expirationDate,
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
  }

  //* ============================================================================================== */

  private getReservationExpiryQr(): Date {
    const minutes = envs.RESERVATION_QR_EXPIRE_MINUTES || 10;
    const now = new Date();
    return new Date(now.getTime() + minutes * 60 * 1000);
  }
}
