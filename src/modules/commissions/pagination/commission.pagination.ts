import { IsOptional, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

import { PaginationDto } from 'src/common/pagination/pagination.dto';

export class CommissionPaginationDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  companyId?: number;
}