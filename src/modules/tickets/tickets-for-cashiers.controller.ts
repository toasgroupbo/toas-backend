import {
  Get,
  Post,
  Body,
  Param,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateTicketInOfficeDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetUser, Resource } from '../../auth/decorators';

import { TicketsService } from './tickets.service';

import { User } from '../users/entities/user.entity';

//!
@Resource(ValidResourses.CASHIER_TICKET)
@ApiBearerAuth('access-token')
//!

@ApiTags('Tickets: For Cashiers')
@Controller('tickets/for-cashier')
export class TicketsForCashiersController {
  constructor(private readonly ticketsService: TicketsService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  createInOffice(
    @Body() createTicketDto: CreateTicketInOfficeDto,
    @GetUser() user: User,
  ) {
    return this.ticketsService.createTicketInOffice(createTicketDto, user);
  }

  //? ============================================================================================== */
  //?                                        Confirm                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CONFIRM)
  //!
  @Post('confirm/:id')
  confirmManual(
    @Param('id', ParseIntPipe) ticketId: number,
    @GetUser() cashier: User,
  ) {
    return this.ticketsService.confirmTicketManual(ticketId, cashier); //! GetCashier
  }

  //? ============================================================================================== */
  //?                                         Cancel                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CANCEL)
  //!
  @Post('cancel/:id')
  cancelManual(
    @Param('id', ParseIntPipe) ticketId: number,
    @GetUser() cashier: User,
  ) {
    return this.ticketsService.cancelTicket(ticketId, cashier); //! GetCashier
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findAll(
    @Param('id', ParseIntPipe) ticketId: number,
    @GetUser() cashier: User,
  ) {
    return this.ticketsService.findAllForCashier(ticketId, cashier); //! GetCashier
  }
}
