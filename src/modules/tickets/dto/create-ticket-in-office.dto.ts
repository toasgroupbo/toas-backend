import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SeatSelectionInOfficeDto } from './selected-seats.dto';

export class CreateTicketInOfficeDto {
  @ApiProperty({
    description: 'Travel ID',
    example: '1',
  })
  @IsNumber()
  travelId: number;

  @ApiProperty({
    type: [SeatSelectionInOfficeDto],
    example: [
      { seatId: '1', price: '40.00' },
      { seatId: '2' }, //! usa precio por defecto
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => SeatSelectionInOfficeDto)
  seatSelections: SeatSelectionInOfficeDto[];

  @ApiProperty({
    description: 'Customer ID',
    example: '1',
  })
  @IsNumber()
  customerId: number;
}
