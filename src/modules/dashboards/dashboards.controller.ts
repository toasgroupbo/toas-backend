import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { DashboardsService } from './dashboards.service';
import {
  DashboardTravelsFilter,
  GetDashboardTravelsDto,
} from './dto/get-dashboard-travels.dto';

//!
@Resource(ValidResourses.DASHBOARD)
@ApiBearerAuth('access-token')
//!

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  //? ============================================================================================== */
  //?                              Dashboard: Admin                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ_ADMIN)
  //!
  @ApiQuery({ name: 'status', required: false, enum: DashboardTravelsFilter })
  @Get('admin')
  getGeneralDashboard(@Query() { status }: GetDashboardTravelsDto) {
    return this.dashboardsService.getGeneralDashboard(status);
  }

  //? ============================================================================================== */
  //?                            Dashboard: Company                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ_COMPANY)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DashboardTravelsFilter })
  @Get('company')
  getCompanyDashboard(
    @GetCompany() companyId: number,
    @Query() { status }: GetDashboardTravelsDto,
  ) {
    return this.dashboardsService.getCompanyDashboard(companyId, status);
  }
}
