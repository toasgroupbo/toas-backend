import {
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateTicketInAppDto, CreateTicketInOfficeDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetUser, Resource } from '../../auth/decorators';

import { TicketsService } from './tickets.service';

import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';

//!
@Resource(ValidResourses.TICKET)
@ApiBearerAuth('access-token')
//!

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post('in-office')
  createInOffice(
    @Body() createTicketDto: CreateTicketInOfficeDto,
    @GetUser() user: User,
  ) {
    return this.ticketsService.createTicketInOffice(createTicketDto, user);
  }

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post('in-app')
  createInApp(
    @Body() createTicketDto: CreateTicketInAppDto,
    @GetUser() customer: Customer,
  ) {
    return this.ticketsService.createTicketInApp(createTicketDto, customer);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Confirm                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CONFIRM)
  //!
  @Post('confirm/:id')
  confirmManual(@Param('id', ParseUUIDPipe) ticketUUID: string) {
    return this.ticketsService.confirmTicketManual(ticketUUID);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                         Cancel                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CANCEL)
  //!
  @Post('cancel/:id')
  cancelManual(@Param('id', ParseUUIDPipe) ticketUUID: string) {
    return this.ticketsService.cancelTicket(ticketUUID);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.ticketsService.findAll(pagination);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.findOne(id);
  }
}
