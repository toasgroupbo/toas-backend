import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { PassengerSeatBatchDto } from './assign-passengers-batch-in-app.dto';

export class AssignPassengersBatchInOfficeDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  ticketId: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  customerId: number;

  @ApiProperty({ type: [PassengerSeatBatchDto] })
  @ValidateNested({ each: true })
  @Type(() => PassengerSeatBatchDto)
  passengers: PassengerSeatBatchDto[];
}
