import { Get, Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetOffice, Resource } from 'src/auth/decorators';

import { RoutesForCashierService } from './routes-for-cashiers.service';

import { Office } from '../offices/entities/office.entity';

//!
@Resource(ValidResourses.ROUTES_CASHIER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Routes: For Cashier')
@Controller('routes/for-cashier')
export class RoutesForCashierController {
  constructor(
    private readonly routesForCashierService: RoutesForCashierService,
  ) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('all')
  finAll(@GetOffice() office: Office) {
    return this.routesForCashierService.findAll(office);
  }
}
