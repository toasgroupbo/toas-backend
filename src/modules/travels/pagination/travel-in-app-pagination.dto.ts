import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class TravelInAppFilterDto {
  @Type(() => Number)
  @IsNumber()
  origin_placeId: number;

  @Type(() => Number)
  @IsNumber()
  destination_placeId: number;

  @IsOptional()
  @IsDateString()
  departure_time?: string;
}
