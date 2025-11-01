import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SeatSelectionDto } from './selected-seats.dto';

export class CreateTicketInOfficeDto {
  @ApiProperty({
    description: 'Travel UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  travelUUID: string;

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

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  customerCI: string;
}
