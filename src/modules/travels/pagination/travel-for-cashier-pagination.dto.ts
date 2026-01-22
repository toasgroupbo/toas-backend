import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class TravelForCashierFilterDto {
  @Type(() => Number)
  @IsNumber()
  destination_placeId: number;
}
