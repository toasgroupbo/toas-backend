import {
  Get,
  Post,
  Body,
  Param,
  Controller,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AssignPassengerInAppDto, CreateTicketInAppDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetUser, Resource } from '../../auth/decorators';

import { TicketsService } from './tickets.service';

import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';

//!
@Resource(ValidResourses.TICKET)
@ApiBearerAuth('access-token')
//!

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Post('in-app')
  createInApp(
    @Body() createTicketDto: CreateTicketInAppDto,
    @GetUser() customer: Customer,
  ) {
    return this.ticketsService.createTicketInApp(createTicketDto, customer);
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get()
  findAll(@GetUser() admin: User) {
    return this.ticketsService.findAll(admin); //! GetUser
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() admin: User) {
    return this.ticketsService.findOne(id, admin); //! GetUser
  }

  //? ============================================================================================== */
  //?                               Assign-Passenger                                                 */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Patch('assign-passenger/in-app')
  assignOccupantFromApp(
    @Body() dto: AssignPassengerInAppDto,
    @GetUser() customer: Customer,
  ) {
    return this.ticketsService.assignPassengerForCustomer(dto, customer);
  }
}
