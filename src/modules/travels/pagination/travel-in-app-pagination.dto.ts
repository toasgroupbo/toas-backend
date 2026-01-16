import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional } from 'class-validator';

export class TravelInAppFilterDto {
  @Type(() => Number)
  @IsNumber()
  origenId: number;

  @Type(() => Number)
  @IsNumber()
  destinationId: number;

  @IsOptional()
  @IsDateString()
  departure_time?: string;
}
