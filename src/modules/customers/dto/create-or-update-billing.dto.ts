import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrUpdateBillingDto {
  @ApiProperty({
    example: 'juan',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    example: '12344552',
  })
  @IsString()
  @IsNotEmpty()
  ci: string;
}
