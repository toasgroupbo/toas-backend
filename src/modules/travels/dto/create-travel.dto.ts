import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateTravelDto {
  @ApiProperty({
    description: 'Bus UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  busUUID: string;

  @ApiProperty({
    description: 'Route UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  routeUUID: string;

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
