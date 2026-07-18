import { Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mails')
export class MailsController {
  constructor(private readonly mailsService: MailService) {}
  @Post()
  sendEmail() {
    const dto = {
      to: 'luisdiegoborja8@gmail.com',
      ticketId: 1,
      ticketNumber: 'TK-001',
      ticketDate: '2026-04-06 10:00',
      totalPrice: 120,

      customerName: 'Juan Perez',
      customerEmail: 'cliente@gmail.com',
      customerPhone: '77777777',
      customerCi: '12345678',

      companyName: 'Bus Express',
      lane: '45',
      saleType: 'Aplicación',
      paymentMethod: 'QR',

      origin: 'Cochabamba',
      destination: 'La Paz',
      departureDate: '10:00',
      departureDay: '06/04/2026',
      departureTime: '10:00',
      arrivalDate: '16:00',
      duration: '6h',
      terminalAddress: 'Terminal Cochabamba',
      terminalDestinationAddress: 'Terminal Santa Cruz',

      passengers: [
        {
          name: 'Juan Perez',
          ci: '12345678',
          seat: '12A',
          deck: '1',
          price: 60,
        },
        {
          name: 'Maria Lopez',
          ci: '87654321',
          seat: '12B',
          deck: '1',
          price: 60,
        },
      ],
    };

    return this.mailsService.sendMail(dto);
  }
}
