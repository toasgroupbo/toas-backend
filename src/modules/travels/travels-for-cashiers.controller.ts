import { Get, Post, Param, Controller, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetOffice, GetUser, Resource } from 'src/auth/decorators';

import { TravelsForCashierService } from './travels-for-cashiers.service';

import { Office } from '../offices/entities/office.entity';
import { User } from '../users/entities/user.entity';

//!
@Resource(ValidResourses.TRAVEL_CASHIER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Travels: For Cashiers')
@Controller('travels/for-cashier')
export class TravelsForCashiersController {
  constructor(
    private readonly travelsForCashierService: TravelsForCashierService,
  ) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('all')
  findAll(@GetOffice() office: Office) {
    return this.travelsForCashierService.findAll(office); //! GetOffice object
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!

  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetOffice() office: Office) {
    return this.travelsForCashierService.findOne(id, office); //! GetOffice object
  }

  //? ============================================================================================== */
  //?                           Get_Seats_Available                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('seats-available/:id')
  getSeatsAvailable(@Param('id', ParseIntPipe) travelId: number) {
    return this.travelsForCashierService.getSeatsAvailable(travelId);
  }

  //? ============================================================================================== */
  //?                                        Closed                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CLOSE)
  //!
  @Post('closed/:id')
  closed(@Param('id', ParseIntPipe) id: number, @GetUser() cashier: User) {
    return this.travelsForCashierService.close(id, cashier);
  }
}
