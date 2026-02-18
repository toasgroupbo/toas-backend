import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SeatSelectionInOfficeDto } from './selected-seats.dto';
import { PaymentType } from '../enums/payment-type.enum';

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

  @ApiProperty({
    example: PaymentType.CASH,
    enum: PaymentType,
  })
  @IsString()
  @IsEnum(PaymentType)
  payment_type: PaymentType;
}
