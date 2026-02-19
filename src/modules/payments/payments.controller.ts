import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { BasicAuthGuard } from './guards/basic-auth.guard';

import { GenerateQrDto } from './dto/generate-qr.dto';
import { BcpQrCallbackDto } from './interfaces/response-qr-callback.interface';

import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  //? ============================================================================================== */
  //?                                   Generate_QR                                                  */
  //? ============================================================================================== */

  /* @Post('generate')
  generateQr(@Body() generateQrDto: GenerateQrDto) {
    return this.paymentsService.generateQr(generateQrDto);
  } */

  //? ============================================================================================== */
  //?                                      CallBack                                                  */
  //? ============================================================================================== */

  @Post('qr/callback')
  @UseGuards(BasicAuthGuard)
  async receiveQrCallback(@Body() qrcallbackDto: BcpQrCallbackDto) {
    try {
      //  Aquí validas si el Id existe en tu sistema

      await this.paymentsService.callback(qrcallbackDto);
      const id = qrcallbackDto.Id;

      //  Procesas el pago
      console.log(qrcallbackDto);

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
