import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class BillingDto {
  @ApiProperty({
    example: '12344552',
  })
  @IsString()
  @IsNotEmpty()
  ci: string;

  @ApiProperty({
    example: 'juan',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
