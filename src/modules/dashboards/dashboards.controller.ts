import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { DashboardsService } from './dashboards.service';

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
  @Auth(ValidPermissions.READ_DASBOARD_ADMIN)
  //!
  @Get('admin')
  getGeneralDashboard() {
    return this.dashboardsService.getGeneralDashboard();
  }

  //? ============================================================================================== */
  //?                            Dashboard: Company                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ_DASBOARD_COMPANY)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Get('company')
  getCompanyDashboard(@GetCompany() companyId: number) {
    return this.dashboardsService.getCompanyDashboard(companyId);
  }
}
