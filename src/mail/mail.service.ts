import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

import { SendMailPaymentConfirmationDto } from './dto/sendmail-payment-confirmation.dto';

import { PdfService } from './pdf.service';
import { TemplateService } from './template.service';

@Injectable()
export class MailService {
  constructor(
    private readonly pdfService: PdfService,
    private readonly mailerService: MailerService,
    private readonly templateService: TemplateService,
  ) {}

  async sendMail(dto: SendMailPaymentConfirmationDto) {
    const { to } = dto;

    //! 1. DATA para PDF
    const pdfData = {
      TICKET_ID: dto.ticketNumber,
      ISSUE_DATE: dto.ticketDate,
      PASSENGER_NAME: dto.customerName,
      ORIGIN: dto.origin,
      DESTINATION: dto.destination,
      DEPARTURE_TIME: dto.departureDate,
      ARRIVAL_TIME: dto.arrivalDate,
      DURATION: dto.duration,
      TERMINAL_ADDRESS: dto.terminalAddress,
      OPERATOR: 'Bus Express',
      BUS_CLASS: 'Normal',
      BAGGAGE_ALLOWANCE: '20kg',
      YEAR: new Date().getFullYear(),
    };

    //! 2. Generar HTML del PDF
    const ticketHtml = this.templateService.populateTemplate(
      'booking-ticket-pdf',
      pdfData,
      dto.passengers,
    );

    //! 3. Generar PDF
    const pdfBuffer = await this.pdfService.generatePdf(ticketHtml);

    //! 4. DATA para el recibo de compra
    const receiptData = {
      COMPANY_NAME: dto.companyName,
      TICKET_ID: dto.ticketId,
      ORIGIN: dto.origin,
      DESTINATION: dto.destination,
      DEPARTURE_DATE: dto.departureDay,
      DEPARTURE_TIME: dto.departureTime,
      LANE: dto.lane,
      CUSTOMER_NAME: dto.customerName,
      CUSTOMER_CI: dto.customerCi,
      TOTAL_PRICE: dto.totalPrice,
      SALE_TYPE: dto.saleType,
      PAYMENT_METHOD: dto.paymentMethod,
      ISSUE_DATE: dto.ticketDate,
    };

    //! 5. Generar HTML y PDF del recibo
    const receiptHtml = this.templateService.populateTemplate(
      'receipt-ticket-pdf',
      receiptData,
      dto.passengers,
    );
    const receiptPdfBuffer = await this.pdfService.generatePdf(receiptHtml);

    const passengerNames = dto.passengers?.map((p) => p.name).join(', ');
    const context = {
      ...dto,
      passengerNames,
    };

    return this.mailerService.sendMail({
      to,
      subject: 'Confirmación de Pago',
      //cc: envs.MAIL_FROM,
      template: 'paid-order-test',
      context,

      //! se agregan los PDF como adjuntos
      attachments: [
        {
          filename: `ticket-${dto.ticketNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
        {
          filename: `recibo-${dto.ticketNumber}.pdf`,
          content: receiptPdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
