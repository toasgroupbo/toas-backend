import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  companyId?: number;
}
