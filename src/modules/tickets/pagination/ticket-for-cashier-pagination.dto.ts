import { IsEnum, IsNumber, IsOptional } from 'class-validator';

import { TicketStatus } from '../enums';
import { Type } from 'class-transformer';

export class TicketForCashierFilterDto {
  @IsOptional()
  @IsEnum([TicketStatus.SOLD, TicketStatus.CANCELLED])
  status?: TicketStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  companyId?: number;
}
