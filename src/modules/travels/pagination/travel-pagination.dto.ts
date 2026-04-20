import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';

import { PaginationDto } from 'src/common/pagination/pagination.dto';

import { TravelStatus } from '../enums/travel-status.enum';

import { Type } from 'class-transformer';

export class TravelPaginationDto extends PaginationDto {
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
  @IsEnum(TravelStatus)
  status?: TravelStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  companyId?: number;
}
