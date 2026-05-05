import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommissionDto {
  @ApiPropertyOptional({
    example: '10.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/)
  paid?: string;

  @ApiPropertyOptional({
    example: 'image1',
  })
  @IsOptional()
  @IsString()
  voucher?: string;

  @ApiPropertyOptional({
    example: '2026-05-05T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string; // ISO string (ej: 2026-05-05T10:00:00Z)
}
