import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentQR } from './entities/payment-qr.entity';

import { HttpService } from './http/http.service';

import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentQR]), TicketsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, HttpService],
})
export class PaymentsModule {}
