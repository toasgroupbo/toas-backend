import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { PaymentType } from '../enums/payment-type.enum';

import { SeatSelectionInOfficeDto } from './selected-seats.dto';

export class CreateTicketInOfficeDto {
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
    example: PaymentType.CASH,
    enum: [PaymentType.QR, PaymentType.CASH],
  })
  @IsString()
  @IsEnum([PaymentType.QR, PaymentType.CASH])
  payment_type: PaymentType;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ApiProperty({
    description: 'Travel ID',
    example: 1,
  })
  @IsNumber()
  travelId: number;

  @ApiProperty({
    description: 'Customer ID',
    example: 1,
  })
  @IsNumber()
  customerId: number;
}
