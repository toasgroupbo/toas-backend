import { Get, Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ValidResourses } from 'src/common/enums';

import { Auth, Resource } from 'src/auth/decorators';

import { RoutesInAppService } from './routes-in-app.service';
import { IsVerifyGuard } from 'src/auth/guards';

//!
@Resource(ValidResourses.ROUTE_APP)
@ApiBearerAuth('access-token')
//!

@ApiTags('Routes: In App')
@Controller('routes/in-app')
export class RoutesInAppController {
  constructor(private readonly routesInAppService: RoutesInAppService) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('all')
  finAll() {
    return this.routesInAppService.findAll();
  }
}
