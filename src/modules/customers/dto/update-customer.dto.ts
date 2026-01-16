import { ApiProperty } from '@nestjs/swagger';

import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @ApiProperty({
    example: 'juan',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 78926281,
  })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: '1998-04-15',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({
    example: 'image.jpg',
  })
  @IsOptional()
  @IsString()
  photo?: string;
}
