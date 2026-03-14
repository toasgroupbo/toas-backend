import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class CreateWalletRechargeDto {
  @ApiProperty({
    description: 'Amount',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;
}
