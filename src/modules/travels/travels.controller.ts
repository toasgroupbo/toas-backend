import {
  Get,
  Post,
  Query,
  Param,
  Delete,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';
import { TravelStatus } from './enums/travel-status.enum';

import { TravelPaginationDto } from './pagination/travel-pagination.dto';

import { TravelsService } from './travels.service';
import { ReportPaginationDto } from './pagination/report-pagination.dto';

//!
@Resource(ValidResourses.TRAVEL)
@ApiBearerAuth('access-token')
//!

@ApiTags('Travels')
@Controller('travels')
export class TravelsController {
  constructor(private readonly travelsService: TravelsService) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
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
    enum: TravelStatus,
  })
  @Get()
  findAll(
    @Query() pagination: TravelPaginationDto,
    @GetCompany() companyId: number,
  ) {
    return this.travelsService.findAll(pagination, companyId);
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCompany() companyId: number,
  ) {
    return this.travelsService.findOne(id, companyId);
  }

  //? ============================================================================================== */
  //?                                        Report                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
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
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Get('cLosed-travels/report')
  closedTravelsReport(
    @Query() pagination: ReportPaginationDto,
    @GetCompany() companyId: number,
  ) {
    return this.travelsService.closedTravelsReport(companyId, pagination);
  }
}
