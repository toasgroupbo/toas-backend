import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class TravelInAppFilterDto {
  @Type(() => Number)
  @IsNumber()
  routeId: number;

  @IsOptional()
  @IsDateString()
  departure_time?: string;
}
