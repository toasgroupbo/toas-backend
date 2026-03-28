import {
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetOffice, GetUser, Resource } from 'src/auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { TravelForCashierFilterDto } from '../pagination';

import { CreateTravelDto } from '../dto';

import { TravelsService } from '../travels.service';
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

    private readonly travelsService: TravelsService,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() dto: CreateTravelDto /* @GetOffice() office: Office */) {
    return this.travelsService.create(dto /* , office */); //! Get Office
  }

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
    return this.travelsForCashierService.findAll(filters, office); //! Get Office
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetOffice() office: Office) {
    return this.travelsForCashierService.findOne(id, office); //! Get Office
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
    return this.travelsForCashierService.close(id, cashier); //! Get Cashier
  }

  //? ============================================================================================== */
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CANCEL)
  //!
  //@ApiQuery({ name: 'companyId', required: false, type: Number })
  @Post('cancel/:id')
  cancel(@Param('id', ParseIntPipe) id: number, @GetOffice() office: Office) {
    return this.travelsService.cancel(id, office); //! Get Office
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  /* //!
  @Auth(ValidPermissions.DELETE)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @GetOffice() office: Office) {
    return this.travelsService.remove(id, office); //! Get Office
  } */
}
