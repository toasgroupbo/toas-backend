import { Get, Param, Controller, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetCompany, Resource } from '../../auth/decorators';

import { TicketsService } from './tickets.service';

//!
@Resource(ValidResourses.TICKET)
@ApiBearerAuth('access-token')
//!

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Get(':travelId')
  findAll(
    @Param('travelId', ParseIntPipe) travelId: number,
    @GetCompany() companyId: number,
  ) {
    return this.ticketsService.findAll(companyId, travelId); //! GetCompany
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  /* //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() admin: User) {
    return this.ticketsService.findOne(id, admin); //! GetUser
  } */
}
