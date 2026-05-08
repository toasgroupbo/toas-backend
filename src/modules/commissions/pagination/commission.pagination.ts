import { IsOptional, IsBoolean, IsDateString, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { PaginationDto } from 'src/common/pagination/pagination.dto';

export class CommissionPaginationDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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
