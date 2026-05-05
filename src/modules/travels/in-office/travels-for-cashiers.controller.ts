import {
  Get,
  Post,
  Body,
  Query,
  Param,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  Auth,
  GetUser,
  Resource,
  GetOffice,
  GetCompany,
} from 'src/auth/decorators';

import { TravelStatus } from '../enums';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { TravelForCashierFilterDto } from '../pagination';

import { CancelTravelDto, CreateTravelDto } from '../dto';
import { AssignStaffDto } from '../dto/assing-staff.dto';

import { StaffService } from '../staff.service';
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

    private readonly staffService: StaffService,

    private readonly travelsService: TravelsService,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(
    @Body() dto: CreateTravelDto,
    @GetOffice() office: Office,
    @GetUser() cashier: User,
  ) {
    return this.travelsService.create(dto, office, cashier); //! Get Office
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({
    name: 'origin_placeId',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'destination_placeId',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [TravelStatus.ACTIVE, TravelStatus.CLOSED],
  })
  @Get('all')
  findAll(
    @Query() filters: TravelForCashierFilterDto,
    @GetOffice() office: Office,
  ) {
    return this.travelsForCashierService.findAll(filters, office); //! Get Office
  }

  //? ============================================================================================== */
  //?                               FindAllForOwners                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ_OWNER)
  //!
  @ApiQuery({
    name: 'origin_placeId',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'destination_placeId',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [TravelStatus.ACTIVE, TravelStatus.CLOSED, TravelStatus.CANCELLED],
  })
  @ApiQuery({
    name: 'isPaid',
    required: false,
    type: Boolean,
  })
  @Get('owner/all')
  findAllForOwners(
    @Query() filters: TravelForCashierFilterDto,

    @GetUser() cashierOwner: User,
  ) {
    return this.travelsForCashierService.findAllForOwners(
      filters,
      cashierOwner,
    );
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
  @Post('cancel/:id')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @GetOffice() office: Office,
    @GetUser() cashier: User,
    @Body() dto: CancelTravelDto,
  ) {
    return this.travelsService.cancel(id, office, dto, cashier);
  }

  //? ============================================================================================== */
  //?                                 FindOne_Staff                                                  */
  //? ============================================================================================== */

  @Auth(ValidPermissions.READ)
  @Get('staff/:ci')
  findOneStaff(@Param('ci') ci: string, @GetCompany() companyId: number) {
    return this.staffService.findOne(ci, companyId);
  }

  //? ============================================================================================== */
  //?                                  Assign_Staff                                                  */
  //? ============================================================================================== */

  @Auth(ValidPermissions.UPDATE)
  @Post('assign-staff/:travelId')
  assignStaff(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Body() dto: AssignStaffDto,
    @GetOffice() office: Office,
  ) {
    return this.travelsForCashierService.assignStaff(travelId, dto, office);
  }
}
