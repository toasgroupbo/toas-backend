import { ApiProperty } from '@nestjs/swagger';
import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SeatSelectionDto } from './selected-seats.dto';

export class CreateTicketInAppDto {
  @ApiProperty({
    description: 'Travel ID',
    example: '1',
  })
  @IsString()
  travelId: number;

  @ApiProperty({
    type: [SeatSelectionDto],
    example: [
      { seatId: '1', price: '40.00' },
      { seatId: '2' }, //! usa precio por defecto
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => SeatSelectionDto)
  seatSelections: SeatSelectionDto[];
}
