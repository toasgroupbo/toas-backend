import { IsEnum, IsOptional } from 'class-validator';

import { TicketStatus } from '../enums';

export class TicketForCashierFilterDto {
  @IsOptional()
  @IsEnum([TicketStatus.SOLD, TicketStatus.CANCELLED])
  status?: TicketStatus;
}
