import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class TravelForCashierFilterDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  destination_placeId?: number;

  @IsOptional()
  @IsDateString()
  departure_time?: string;
}
