import { IsEnum, IsNumber, IsOptional } from 'class-validator';

import { PaginationDto } from 'src/common/pagination/pagination.dto';

import { TravelStatus } from '../enums/travel-status.enum';
import { Type } from 'class-transformer';

export class TravelPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TravelStatus)
  status?: TravelStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  companyId?: number;
}
