import {
  Get,
  Post,
  Body,
  Param,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  AssignPassengersBatchInOfficeDto,
  CreateTicketInOfficeDto,
} from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetUser, Resource } from '../../auth/decorators';

import { TicketsForCashierService } from './tickets-for-cashiers.service';

import { User } from '../users/entities/user.entity';

//!
@Resource(ValidResourses.TICKET_CASHIER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Tickets: For Cashiers')
@Controller('tickets/for-cashier')
export class TicketsForCashiersController {
  constructor(
    private readonly ticketsForCashierService: TicketsForCashierService,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(
    @Body() createTicketDto: CreateTicketInOfficeDto,
    @GetUser() user: User,
  ) {
    return this.ticketsForCashierService.create(createTicketDto, user);
  }

  //? ============================================================================================== */
  //?                                        Confirm                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CONFIRM)
  //!
  @Post('confirm/:id')
  confirm(
    @Param('id', ParseIntPipe) ticketId: number,
    @GetUser() cashier: User,
  ) {
    return this.ticketsForCashierService.confirm(ticketId, cashier); //! GetCashier
  }

  //? ============================================================================================== */
  //?                                         Cancel                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CANCEL)
  //!
  @Post('cancel/:id')
  cancel(
    @Param('id', ParseIntPipe) ticketId: number,
    @GetUser() cashier: User,
  ) {
    return this.ticketsForCashierService.cancel(ticketId, cashier); //! GetCashier
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':travelId')
  findAll(
    @Param('travelId', ParseIntPipe) travelId: number,
    @GetUser() cashier: User,
  ) {
    return this.ticketsForCashierService.findAll(travelId, cashier); //! GetCashier
  }

  //? ============================================================================================== */
  //?                                Assign_Passenger                                                */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Post('assign-passenger')
  assignOccupant(@Body() dto: AssignPassengersBatchInOfficeDto) {
    return this.ticketsForCashierService.assignPassenger(dto);
  }
}
