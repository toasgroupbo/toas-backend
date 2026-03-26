import { Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mails')
export class MailsController {
  constructor(private readonly mailsService: MailService) {}
  /* @Post()
  sendEmail() {
    return this.mailsService.sendMail('luisdiegoborja8@gmail.com', 'prueba');
  } */
}
