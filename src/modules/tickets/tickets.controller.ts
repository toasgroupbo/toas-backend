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
import { ApiTags } from '@nestjs/swagger';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateTicketInAppDto, CreateTicketInOfficeDto } from './dto';

import { GetUser } from '../../auth/decorators';

import { TicketsService } from './tickets.service';

import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @Post('in-office')
  createInOffice(
    @Body() createTicketDto: CreateTicketInOfficeDto,
    @GetUser() user: User,
  ) {
    return this.ticketsService.createTicketInOffice(createTicketDto, user);
  }

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

  @Post('confirm/:id')
  confirmManual(@Param('id', ParseUUIDPipe) ticketUUID: string) {
    return this.ticketsService.confirmTicketManual(ticketUUID);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                         Cancel                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  @Post('cancel/:id')
  cancelManual(@Param('id', ParseUUIDPipe) ticketUUID: string) {
    return this.ticketsService.cancelTicket(ticketUUID);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.ticketsService.findAll(pagination);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.findOne(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  /*   @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, updateTicketDto);
  } */

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.remove(id);
  }
}
