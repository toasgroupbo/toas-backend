import {
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

import { PaginationDto } from 'src/common/pagination/pagination.dto';

import { TravelStatus } from '../enums/travel-status.enum';

import { Transform, Type } from 'class-transformer';

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
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isPaid?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  companyId?: number;
}
