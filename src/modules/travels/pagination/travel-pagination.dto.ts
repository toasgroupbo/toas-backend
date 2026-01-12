import { IsEnum, IsOptional } from 'class-validator';

import { PaginationDto } from 'src/common/pagination/pagination.dto';

import { TravelStatus } from '../enums/travel-status.enum';

export class TravelPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TravelStatus)
  status?: TravelStatus;
}
