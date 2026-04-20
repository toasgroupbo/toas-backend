import { Get, Param, Controller, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from '../../auth/decorators';

import { TicketStatus } from './enums';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { TicketsService } from './tickets.service';
import { TicketForCashierFilterDto } from './pagination/ticket-for-cashier-pagination.dto';

//!
@Resource(ValidResourses.TICKET)
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
  @ApiBearerAuth('access-token')
  //!
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [TicketStatus.SOLD, TicketStatus.CANCELLED],
  })
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Get(':travelId')
  findAll(
    @Query() filters: TicketForCashierFilterDto,
    @Param('travelId', ParseIntPipe) travelId: number,
    @GetCompany() companyId: number,
  ) {
    return this.ticketsService.findAll(companyId, travelId, filters);
  }
}
