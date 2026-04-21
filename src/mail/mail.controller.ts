import { Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mails')
export class MailsController {
  constructor(private readonly mailsService: MailService) {}
  @Post()
  sendEmail() {
    const dto = {
      to: 'luisdiegoborja8@gmail.com',
      ticketNumber: 'TK-001',
      ticketDate: '2026-04-06',
      totalPrice: 120,

      customerName: 'Juan Perez',
      customerEmail: 'cliente@gmail.com',
      customerPhone: '77777777',

      origin: 'Cochabamba',
      destination: 'La Paz',
      departureDate: '10:00',
      arrivalDate: '16:00',
      duration: '6h',
      terminalAddress: 'Terminal Cochabamba',

      passengers: [
        {
          name: 'Juan Perez',
          ci: '12345678',
          seat: '12A',
          deck: '1',
        },
        {
          name: 'Maria Lopez',
          ci: '87654321',
          seat: '12B',
          deck: '1',
        },
      ],
    };

    return this.mailsService.sendMail(dto);
  }
}
