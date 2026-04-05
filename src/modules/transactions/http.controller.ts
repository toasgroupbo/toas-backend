import { Post, Body, Controller } from '@nestjs/common';

import { HttpService } from './http/http.service';

@Controller('http')
export class HttpController {
  constructor(private readonly httpService: HttpService) {}

  //? ============================================================================================== */
  //?                                 ProcessMultiple                                                */
  //? ============================================================================================== */

  /* @Post('ProcessMultiple')
  async processMultiple(
    @Body() data: { companyId: number; data: string; signature: string },
  ) {
    return this.httpService.processMultiple(data);
  } */

  //? ============================================================================================== */
  //?                                 AuthorizedBatch                                                */
  //? ============================================================================================== */

  /* @Post('AuthorizedBatch')
  async authorizedBatch(
    @Body() data: { companyId: number; data: string; signature: string },
  ) {
    return this.httpService.authorizedBatch(data);
  } */

  //? ============================================================================================== */
  //?                                  GetBatchDetail                                                */
  //? ============================================================================================== */

  /* @Post('GetBatchDetail')
  async getBatchDetail(
    @Body() data: { companyId: number; data: string; signature: string },
  ) {
    return this.httpService.getBatchDetail(data);
  } */
}
