import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { randomUUID } from 'crypto';

import { Auth, GetCustomer, Resource } from 'src/auth/decorators';
import { ValidResourses } from 'src/common/enums';
import { BasicAuthGuard } from './guards/basic-auth.guard';

import { VerifyQrDto } from './dto/verify-qr.dto';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { CreateWalletRechargeDto } from './dto/recharge-qr.dto';
import { QrCallbackResponse } from './interfaces/qr-callback-response.interface';

import { PaymentsService } from './payments.service';

import { Customer } from '../customers/entities/customer.entity';

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
  generateQr(@Body() dto: GenerateQrDto) {
    return this.paymentsService.generateQr(dto);
  }

  //? ============================================================================================== */
  //?                                      Recharge                                                  */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Post('recharge/qr')
  createRechargeQr(
    @Body() dto: CreateWalletRechargeDto,
    @GetCustomer() customer: Customer,
  ) {
    return this.paymentsService.generateQrForRecharge(customer, dto.amount);
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
  async receiveQrCallback(@Body() response: QrCallbackResponse) {
    try {
      await this.paymentsService.callback(response);
      const id = response.Id;

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
