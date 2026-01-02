import { Get, Post, Param, Controller, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetOffice, GetUser, Resource } from 'src/auth/decorators';

import { TravelsService } from './travels.service';

import { Office } from '../offices/entities/office.entity';
import { User } from '../users/entities/user.entity';

//!
@Resource(ValidResourses.CASHIER_TRAVEL)
@ApiBearerAuth('access-token')
//!

@ApiTags('Travels: For Cashiers')
@Controller('travels/for-cashier')
export class TravelsForCashiersController {
  constructor(private readonly travelsService: TravelsService) {}

  //? ============================================================================================== */
  //?                           Get_Seats_Available                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('seats-available/:id')
  getSeatsAvailable(@Param('id', ParseIntPipe) id: number) {
    return this.travelsService.getSeatsAvailable(id);
  }

  //? ============================================================================================== */
  //?                                 Closed_Travel                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CLOSE)
  //!
  @Post('closed/:id')
  closed(@Param('id', ParseIntPipe) id: number, @GetUser() cashier: User) {
    return this.travelsService.close(id, cashier);
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('all')
  findAllTravelsforCashier(@GetOffice() office: Office) {
    return this.travelsService.findAllForCashier(office); //! GetOffice object
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!

  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOneTravelsforCashier(
    @Param('id', ParseIntPipe) id: number,
    @GetOffice() office: Office,
  ) {
    return this.travelsService.findOneForCashier(id, office); //! GetOffice object
  }
}
