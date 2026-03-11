import {
  Get,
  Post,
  Query,
  Param,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetOffice, GetUser, Resource } from 'src/auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { TravelForCashierFilterDto } from '../pagination';

import { TravelsForCashierService } from './travels-for-cashiers.service';

import { User } from '../../users/entities/user.entity';
import { Office } from '../../offices/entities/office.entity';

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
  @ApiQuery({
    name: 'destination_placeId',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'departure_time',
    required: false,
    type: Date,
  })
  @Get('all')
  findAll(
    @Query() filters: TravelForCashierFilterDto,
    @GetOffice() office: Office,
  ) {
    return this.travelsForCashierService.findAll(filters, office);
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetOffice() office: Office) {
    return this.travelsForCashierService.findOne(id, office);
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
