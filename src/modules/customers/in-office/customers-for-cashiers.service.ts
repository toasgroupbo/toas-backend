import { Injectable } from '@nestjs/common';

import { PassengersService } from '../passengers.service';

@Injectable()
export class CustomersForCashierService {
  constructor(private readonly passengersService: PassengersService) {}

  //? ============================================================================================== */
  //?                              FindOne_Passengers                                                */
  //? ============================================================================================== */

  async findOne(ci: string) {
    return this.passengersService.findOne(ci);
  }
}
