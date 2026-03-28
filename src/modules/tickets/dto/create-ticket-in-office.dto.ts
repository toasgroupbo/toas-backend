import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { PaymentType } from '../enums/payment-type.enum';

import { CreateTicketDto } from './create-ticket.dto';
import { SeatSelectionInOfficeDto } from './selected-seats.dto';
import { BillingDto } from './billing.dto';

export class CreateTicketInOfficeDto extends CreateTicketDto {
  @ApiProperty({
    type: [SeatSelectionInOfficeDto],
    example: [{ seatId: '1', price: '40.00' }, { seatId: '2' }],
  })
  @ValidateNested({ each: true })
  @Type(() => SeatSelectionInOfficeDto)
  seatSelections: SeatSelectionInOfficeDto[];

  @ApiProperty({
    type: BillingDto,
    description: 'Datos de facturación',
  })
  @ValidateNested()
  @Type(() => BillingDto)
  @IsDefined()
  billing: BillingDto;

  @ApiProperty({
    example: PaymentType.CASH,
    enum: [PaymentType.QR, PaymentType.CASH],
  })
  @IsString()
  @IsEnum([PaymentType.QR, PaymentType.CASH])
  payment_type: PaymentType;
}
