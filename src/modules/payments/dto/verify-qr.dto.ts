import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class VerifyQrDto {
  @ApiProperty({
    description: 'Ticket Id',
    example: 1,
  })
  @IsNumber()
  ticketId: number;
}
