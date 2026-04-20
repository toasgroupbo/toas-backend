import {
  Get,
  Post,
  Body,
  Param,
  Controller,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Auth, GetUser, Resource } from '../../../auth/decorators';

import { TicketStatus } from '../enums';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import {
  CreateTicketInOfficeDto,
  AssignPassengersBatchInOfficeDto,
} from '../dto';
import { TicketForCashierFilterDto } from '../pagination/ticket-for-cashier-pagination.dto';

import { BillingsService } from '../billings.service';
import { TicketsForCashierService } from './tickets-for-cashiers.service';

import { User } from '../../users/entities/user.entity';

//!
@Resource(ValidResourses.TICKET_CASHIER)
@ApiBearerAuth('access-token')
//!

@ApiTags('Tickets: For Cashiers')
@Controller('tickets/for-cashier')
export class TicketsForCashiersController {
  constructor(
    private readonly ticketsForCashierService: TicketsForCashierService,
    private readonly billingsService: BillingsService,
  ) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() dto: CreateTicketInOfficeDto, @GetUser() user: User) {
    return this.ticketsForCashierService.create(dto, user);
  }

  //? ============================================================================================== */
  //?                                Find_Billing_CI                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('billing/:ci')
  findOneBilllingForCi(@Param('ci') ci: string) {
    return this.billingsService.FindOne(ci);
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
    return this.ticketsForCashierService.confirm(ticketId, cashier);
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
    return this.ticketsForCashierService.cancel(ticketId, cashier);
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [TicketStatus.SOLD, TicketStatus.CANCELLED],
  })
  @Get(':travelId')
  findAll(
    @Query() filters: TicketForCashierFilterDto,
    @Param('travelId', ParseIntPipe) travelId: number,
    @GetUser() cashier: User,
  ) {
    return this.ticketsForCashierService.findAll(travelId, cashier, filters);
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
