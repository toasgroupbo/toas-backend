import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PassengerDto {
  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  name: string;

  @ApiProperty({ example: '1234567' })
  @IsString()
  ci: string;
}

export class PassengerSeatBatchDto {
  @ApiProperty({ example: 10 })
  @IsNumber()
  seatId: number;

  @ApiProperty({ type: PassengerDto })
  @ValidateNested()
  @Type(() => PassengerDto)
  passenger: PassengerDto;
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
