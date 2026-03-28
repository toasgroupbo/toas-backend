import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Travel ID',
    example: 1,
  })
  @IsNumber()
  travelId: number;
}
