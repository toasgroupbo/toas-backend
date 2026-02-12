import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { QrCallbackDto } from './dto/qr-callback.dto';

import { BasicAuthGuard } from './guards/basic-auth.guard';

import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('qr/callback')
  @UseGuards(BasicAuthGuard)
  async receiveQrCallback(@Body() body: QrCallbackDto) {
    try {
      //  Aquí validas si el Id existe en tu sistema
      const id = body.Id;

      //  Procesas el pago
      console.log('Pago recibido:', body);

      return {
        State: '000',
        Mensaje: 'COMPLETADO',
        Data: {
          id: id,
        },
      };
    } catch (error) {
      return {
        State: '999',
        Mensaje: 'ERROR',
        Data: {
          id: `E-${randomUUID()}`,
        },
      };
    }
  }
}
