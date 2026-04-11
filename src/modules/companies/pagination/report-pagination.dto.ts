import { IsDateString, IsOptional } from 'class-validator';

export class ReportPaginationDto {
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;
}
