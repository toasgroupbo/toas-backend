import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { randomUUID } from 'crypto';

import { BasicAuthGuard } from './guards/basic-auth.guard';

import { ValidResourses } from 'src/common/enums';

import { VerifyQrDto } from './dto/verify-qr.dto';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { QrCallbackResponse } from './interfaces/qr-callback-response.interface';

import { PaymentsService } from './payments.service';
import { Auth, Resource } from 'src/auth/decorators';

//!
@Resource(ValidResourses.TICKET_CASHIER)
@ApiBearerAuth('access-token')
//!

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  //? ============================================================================================== */
  //?                                   Generate_QR                                                  */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Post('generate')
  generateQr(@Body() generateQrDto: GenerateQrDto) {
    return this.paymentsService.generateQr(generateQrDto);
  }

  //? ============================================================================================== */
  //?                                    Verify_QR                                                   */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Post('verify-qr')
  verifyQr(@Body() dto: VerifyQrDto) {
    return this.paymentsService.verifyQr(dto.ticketId);
  }

  //? ============================================================================================== */
  //?                                      CallBack                                                  */
  //? ============================================================================================== */

  @Post('qr/callback')
  @UseGuards(BasicAuthGuard)
  async receiveQrCallback(@Body() qrcallbackDto: QrCallbackResponse) {
    try {
      //  Aquí validas si el Id existe en tu sistema

      await this.paymentsService.callback(qrcallbackDto);

      //  Procesas el pago
      console.log(qrcallbackDto);

      const id = qrcallbackDto.Id;
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
