import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateWalletForRechargeDto {
  @ApiProperty({
    description: 'Customer IDs array',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @Type(() => Number)
  customerIds: number[];

  @ApiProperty({
    description: 'Monto Por Customer',
    example: 50,
  })
  @IsNumber()
  @Min(1)
  amountPerCustomer: number;
}
