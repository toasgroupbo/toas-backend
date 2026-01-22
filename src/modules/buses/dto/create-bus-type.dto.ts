import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { DeckLayoutDto } from './deck-layout.dto';

import { SeatType } from '../enums';

export class CreateBusTypeDto {
  @ApiProperty({
    description: 'Type Bus Name',
    example: 'Type 1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'List of decks (floors) for the bus type',
    type: [DeckLayoutDto],
    example: [
      {
        deck: 1,
        price: '50.00',
        deckType: 'LEITO',
        seats: [
          {
            row: 1,
            column: 1,
            seatNumber: '1A',
            type: SeatType.SEAT,
          },
          {
            row: 1,
            column: 2,
            seatNumber: '1B',
            type: SeatType.SEAT,
          },
        ],
      },
      {
        deck: 2,
        price: '50.00',
        deckType: 'SEMICAMA',
        seats: [
          {
            row: 1,
            column: 1,
            seatNumber: '2A',
            type: SeatType.SEAT,
          },
          {
            row: 1,
            column: 2,
            seatNumber: '2B',
            type: SeatType.SEAT,
          },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeckLayoutDto)
  decks: DeckLayoutDto[];
}
