import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateTravelDto {
  @ApiProperty({
    description: 'Bus ID',
    example: '1',
  })
  busId: number;

  @ApiProperty({
    description: 'Route ID',
    example: '1',
  })
  routeId: number;

  @ApiProperty({
    example: '10.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/)
  price_deck_1: string;

  @ApiPropertyOptional({
    example: '10.00',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/)
  price_deck_2?: string;

  @ApiProperty({
    example: '2025-10-02T15:00:00Z',
    type: String,
    format: 'date-time',
  })
  @IsDate()
  @Type(() => Date)
  departure_time: Date;

  @ApiProperty({
    example: '2025-10-02T20:00:00Z',
    type: String,
    format: 'date-time',
  })
  @IsDate()
  @Type(() => Date)
  arrival_time: Date;
}
