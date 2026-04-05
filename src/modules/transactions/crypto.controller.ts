import { Post, Body, Controller } from '@nestjs/common';

import { ProcessMultiplePayload } from './interfaces/processmultiple-encrypt.interface';

import { CryptoService } from './crypto.service';
import { AuthorizedBachPayload } from './interfaces/authorizedbach-encrypt.interface';
import { GetBatchDetailPayload } from './interfaces/getbatchdetail-encrypt.interface';

@Controller('crypto')
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  //? ============================================================================================== */
  //?                                     EncryptData                                                */
  //? ============================================================================================== */

  /* @Post('ProcessMultiple/encrypt')
  async encryptProcessMultiple(
    @Body('payload') payload: ProcessMultiplePayload,
  ) {
    return this.cryptoService.encryptProcessMultiple(payload);
  } */

  //? ============================================================================================== */

  /* @Post('AuthorizedBatch/encrypt')
  async encryptAuthorizedBatch(
    @Body('payload') payload: AuthorizedBachPayload,
  ) {
    return this.cryptoService.encryptAuthorizedBatch(payload);
  } */

  //? ============================================================================================== */

  /* @Post('GetBatchDetail/encrypt')
  async encryptGetBatchDetail(@Body('payload') payload: GetBatchDetailPayload) {
    return this.cryptoService.encryptGetBatchDetail(payload);
  } */

  //? ============================================================================================== */
  //?                                     DecryptData                                                */
  //? ============================================================================================== */

  /* @Post('decrypt')
  async decrypt(@Body() body: { body: string }) {
    return this.cryptoService.decryptData(body.body);
  } */
}
