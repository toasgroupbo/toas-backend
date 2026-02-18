import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class GenerateQrDto {
  @ApiProperty({
    description: 'Ticket Id',
    example: 1,
  })
  @IsNumber()
  ticketId: number;

  @ApiPropertyOptional({
    description: 'gloss',
    example: 'PAGO APP BUSES',
  })
  @IsString()
  @IsOptional()
  gloss?: string;
}
