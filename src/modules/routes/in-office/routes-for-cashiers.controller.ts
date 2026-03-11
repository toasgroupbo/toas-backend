import { Get, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth, GetOffice, Resource } from 'src/auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Office } from '../../offices/entities/office.entity';

import { RoutesForCashierService } from './routes-for-cashiers.service';

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
