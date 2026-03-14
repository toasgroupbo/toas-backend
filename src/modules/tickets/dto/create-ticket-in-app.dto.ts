import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SeatSelectionInAppDto } from './selected-seats.dto';
import { PaymentType } from '../enums';

export class CreateTicketInAppDto {
  @ApiProperty({
    type: [SeatSelectionInAppDto],
    example: [{ seatId: '1' }, { seatId: '2' }],
  })
  @ValidateNested({ each: true })
  @Type(() => SeatSelectionInAppDto)
  seatSelections: SeatSelectionInAppDto[];

  @ApiProperty({
    example: PaymentType.QR,
    enum: [PaymentType.QR, PaymentType.WALLET],
  })
  @IsString()
  @IsEnum([PaymentType.QR, PaymentType.WALLET])
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
}
