import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PassengerSeatBatchDto {
  @ApiProperty({ example: 10 })
  @IsNumber()
  seatId: number;

  @ApiProperty({
    example: {
      name: 'Juan Perez',
      ci: '1234567',
    },
  })
  passenger: {
    name: string;
    ci: string;
  };
}

export class AssignPassengersBatchInAppDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  ticketId: number;

  @ApiProperty({ type: [PassengerSeatBatchDto] })
  @ValidateNested({ each: true })
  @Type(() => PassengerSeatBatchDto)
  passengers: PassengerSeatBatchDto[];
}
