import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import { join } from 'path';

import { envs } from 'src/config/environments/environments';

import { MailsController } from './mail.controller';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: envs.MAIL_HOST,
        port: Number(envs.MAIL_PORT),
        secure: false,
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
        //dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [MailsController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
