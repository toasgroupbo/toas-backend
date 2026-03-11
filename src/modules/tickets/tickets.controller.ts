import {
  Get,
  Post,
  Query,
  Param,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from '../../auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { TicketsService } from './tickets.service';

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
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Get(':travelId')
  findAll(
    @Param('travelId', ParseIntPipe) travelId: number,
    @GetCompany() companyId: number,
  ) {
    return this.ticketsService.findAll(companyId, travelId);
  }

  //? ============================================================================================== */
  //?                                     Confirm_QR                                                 */
  //? ============================================================================================== */

  //! solo para pruebas
  @Post('confirm-qr')
  @ApiQuery({ name: 'ticketId', required: true, type: Number })
  confirmQR(@Query() query: any) {
    return this.ticketsService.confirm(query.ticketId);
  }
}
