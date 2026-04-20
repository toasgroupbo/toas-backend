import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';

import { TravelStatus } from '../enums';

import { PaginationDto } from 'src/common/pagination/pagination.dto';

export class TravelForCashierFilterDto extends PaginationDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  destination_placeId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  origin_placeId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum([TravelStatus.ACTIVE, TravelStatus.CLOSED])
  status?: TravelStatus;
}
