import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { CreateTicketDto } from './create-ticket.dto';
import { SeatSelectionInAppDto } from './selected-seats.dto';

export class CreateTicketInAppDto extends CreateTicketDto {
  @ApiProperty({
    type: [SeatSelectionInAppDto],
    example: [{ seatId: '1' }, { seatId: '2' }],
  })
  @ValidateNested({ each: true })
  @Type(() => SeatSelectionInAppDto)
  seatSelections: SeatSelectionInAppDto[];
}
