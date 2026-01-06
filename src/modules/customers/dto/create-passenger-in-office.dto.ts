import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreatePassengerInOfficeDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '1',
  })
  @IsNumber()
  customerId: number;

  @ApiProperty({
    example: 'juan Perez',
  })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '32423534' })
  @IsString()
  ci: string;
}
