import { Get, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  Auth,
  GetCompany,
  GetOffice,
  Resource,
} from '../../../auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { BusesForCashierService } from './buses-for-cashiers.service';
import { Office } from 'src/modules/offices/entities/office.entity';

//!
@Resource(ValidResourses.BUS_CASHIER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Buses: For Cashiers')
@Controller('buses/for-cashier')
export class BusesForCashiersController {
  constructor(
    private readonly busesForCashierService: BusesForCashierService,
  ) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('all')
  findAll(@GetOffice() office: Office) {
    return this.busesForCashierService.findAll(office);
  }
}
