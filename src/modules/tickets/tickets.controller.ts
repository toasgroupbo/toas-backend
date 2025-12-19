import {
  Get,
  Post,
  Body,
  Param,
  Controller,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

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
  //?                                CASHIER:Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Resource(ValidResourses.CASHIER_TICKET)
  @Auth(ValidPermissions.CREATE)
  //!
  @Post('in-office')
  createInOffice(
    @Body() createTicketDto: CreateTicketInOfficeDto,
    @GetUser() user: User,
  ) {
    return this.ticketsService.createTicketInOffice(createTicketDto, user);
  }

  //? ---------------------------------------------------------------------------------------------- */

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
  //?                                CASHIER:Confirm                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Resource(ValidResourses.CASHIER_TICKET)
  @Auth(ValidPermissions.CONFIRM)
  //!
  @Post('confirm/:id')
  confirmManual(
    @Param('id', ParseUUIDPipe) ticketUUID: string,
    @GetUser() user: User,
  ) {
    return this.ticketsService.confirmTicketManual(ticketUUID, user); //! GetUser
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 CASHIER:Cancel                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Resource(ValidResourses.CASHIER_TICKET)
  @Auth(ValidPermissions.CANCEL)
  //!
  @Post('cancel/:id')
  cancelManual(
    @Param('id', ParseUUIDPipe) ticketUUID: string,
    @GetUser() user: User,
  ) {
    return this.ticketsService.cancelTicket(ticketUUID, user); //! GetUser
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                CASHIER:FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Resource(ValidResourses.CASHIER_TICKET)
  @Auth(ValidPermissions.READ)
  //!
  @Get()
  findAll(@GetUser() user: User) {
    return this.ticketsService.findAll(user); //! GetUser
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                CASHIER:FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Resource(ValidResourses.CASHIER_TICKET)
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.ticketsService.findOne(id, user); //! GetUser
  }
}
