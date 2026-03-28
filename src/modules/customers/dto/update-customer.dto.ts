import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  ci?: string;

  @ApiPropertyOptional({
    example: 'juan',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 78926281,
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: '1998-04-15',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsObject()
  billingObject?: any;
}
