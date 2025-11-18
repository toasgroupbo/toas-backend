import { IsEnum, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { SeatType } from '../enums/seat-type.enum';

export class SeatsDto {
  @ApiProperty()
  @IsNumber()
  row: number;

  @ApiProperty()
  @IsNumber()
  column: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  seatNumber?: string;

  @ApiProperty({ enum: SeatType })
  @IsEnum(SeatType)
  type: SeatType;
}

//?     [1A][1B][1C][1D]

/* [
  {
    "row": 1,
    "column": 1,
    "deck": 1,
    "seatNumber": "1A",
    "type": "seat",
    "isVirtual": false
  },
  {
    "row": 1,
    "column": 2,
    "deck": 1,
    "seatNumber": "1B",
    "type": "seat",
    "isVirtual": false
  },
  {
    "row": 1,
    "column": 4,
    "deck": 1,
    "type": "space",
    "isVirtual": false
  },
  {
    "row": 1,
    "column": 5,
    "deck": 1,
    "seatNumber": "1D",
    "type": "seat",
    "isVirtual": false
  }
] */
