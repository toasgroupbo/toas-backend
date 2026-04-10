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

export class VerifyQrRechargeDto {
  @ApiProperty({
    description: 'Id Correlation',
    example: 1,
  })
  @IsNumber()
  IdCorrelation: string;
}
