import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SeatSelectionInAppDto } from './selected-seats.dto';

export class CreateTicketInAppDto {
  @ApiProperty({
    description: 'Travel ID',
    example: '1',
  })
  @IsNumber()
  travelId: number;

  @ApiProperty({
    type: [SeatSelectionInAppDto],
    example: [{ seatId: '1' }, { seatId: '2' }],
  })
  @ValidateNested({ each: true })
  @Type(() => SeatSelectionInAppDto)
  seatSelections: SeatSelectionInAppDto[];
}
