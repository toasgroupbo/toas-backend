import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

import { envs } from 'src/config/environments/environments';

import { SendMailPaymentConfirmationDto } from './dto/sendmail-payment-confirmation.dto';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(dto: SendMailPaymentConfirmationDto) {
    const { to } = dto;

    const context = {
      ...dto,
    };

    return this.mailerService.sendMail({
      to,
      subject: 'Confirmación de Pago',
      cc: envs.MAIL_FROM,
      template: 'paid-order',
      context,
    });
  }
}
