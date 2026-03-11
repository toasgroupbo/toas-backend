import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentQR } from './entities/payment-qr.entity';

import { HttpService } from './http/http.service';

import { WalletModule } from '../wallet/wallet.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentQR]), TicketsModule, WalletModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, HttpService],
})
export class PaymentsModule {}
