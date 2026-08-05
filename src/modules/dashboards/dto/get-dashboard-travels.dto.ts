import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DashboardTravelsFilter {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export class GetDashboardTravelsDto {
  @ApiPropertyOptional({ enum: DashboardTravelsFilter })
  @IsOptional()
  @IsEnum(DashboardTravelsFilter)
  status?: DashboardTravelsFilter;
}
