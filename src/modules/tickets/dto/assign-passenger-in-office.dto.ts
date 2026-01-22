import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class AssignPassengerInOfficeDto {
  @ApiProperty({
    description: 'Ticket ID',
    example: '1',
  })
  @IsNumber()
  ticketId: number;

  @ApiProperty({
    description: 'Seat ID',
    example: '1',
  })
  @IsNumber()
  seatId: number;

  @ApiProperty({
    description: 'Passenger ID',
    example: '1',
  })
  @IsNumber()
  passengerId: number;

  @ApiProperty({
    description: 'Customer ID',
    example: '1',
  })
  @IsNumber()
  customerId: number;
}
