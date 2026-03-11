import {
  Body,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AssignPassengersBatchInAppDto, CreateTicketInAppDto } from '../dto';

import { ValidResourses } from 'src/common/enums';

import { Auth, GetCustomer, Resource } from '../../../auth/decorators';

import { IsVerifyGuard } from '../guards/is-verify.guard';
import { IsPenaltyGuard } from '../guards/is-penalty.guard';
import { NoActiveReservationGuard } from '../guards/no-active-reservation.guard';

import { Customer } from '../../customers/entities/customer.entity';

import { TicketsInAppService } from './tickets-in-app.service';
import { WalletService } from 'src/modules/wallet/wallet.service';

//!
@Resource(ValidResourses.TICKET_APP)
@ApiBearerAuth('access-token')
//!

@ApiTags('Tickets: In App')
@Controller('tickets/in-app')
export class TicketsInAppController {
  constructor(
    private readonly ticketsInAppService: TicketsInAppService,

    private readonly walletService: WalletService,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard, IsPenaltyGuard, NoActiveReservationGuard)
  @Auth()
  //!
  @Post()
  create(@Body() dto: CreateTicketInAppDto, @GetCustomer() customer: Customer) {
    return this.ticketsInAppService.create(dto, customer);
  }

  //? ============================================================================================== */
  //?                                         Cancel                                                 */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Post('cancel/:id')
  cancel(
    @Param('id', ParseIntPipe) ticketId: number,
    @GetCustomer() customer: Customer,
  ) {
    return this.ticketsInAppService.cancel(ticketId, customer);
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('all')
  findAll(@GetCustomer() customer: Customer) {
    return this.ticketsInAppService.findAll(customer);
  }

  //? ============================================================================================== */
  //?                        Get_Active_Reservation                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('get-active-reservation')
  getActiveReservation(@GetCustomer() customer: Customer) {
    return this.ticketsInAppService.getActiveReservation(customer);
  }

  //? ============================================================================================== */
  //?                               Assign-Passenger                                                 */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Post('assign-passenger')
  assignOccupant(
    @Body() dto: AssignPassengersBatchInAppDto,
    @GetCustomer() customer: Customer,
  ) {
    return this.ticketsInAppService.assignPassenger(dto, customer);
  }

  //? ============================================================================================== */
  //?                        Get_Active_Reservation                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get('balance')
  getBalance(@GetCustomer() customer: Customer) {
    return this.walletService.getAvailableBalance(customer);
  }
}
