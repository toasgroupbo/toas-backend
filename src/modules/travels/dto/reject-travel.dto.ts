import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectTravelDto {
  @ApiPropertyOptional({
    example: 'El bus está en mantenimiento ese día',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejection_reason?: string;
}
