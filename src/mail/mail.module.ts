import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import { join } from 'path';

import { envs } from 'src/config/environments/environments';

import { MailsController } from './mail.controller';

import { PdfService } from './pdf.service';
import { MailService } from './mail.service';
import { TemplateService } from './template.service';

@Global()
@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: envs.MAIL_HOST,
        port: Number(envs.MAIL_PORT),
        secure: true,
        auth: {
          user: envs.MAIL_USER,
          pass: envs.MAIL_PASS,
        },
      },
      defaults: {
        from: envs.MAIL_FROM,
      },
      preview: false,
      template: {
        dir: join(process.cwd(), 'dist/mail/templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: false,
        },
      },
    }),
  ],
  controllers: [MailsController],
  providers: [MailService, PdfService, TemplateService],
  exports: [MailService],
})
export class MailModule {}
