import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

//! para guaradr en la entity
export class SelectedSeatsDto {
  @IsString()
  seatNumber: string;

  @IsNumberString()
  price: string;
}

//! para la creacion del ticket
export class SeatSelectionDto {
  @ApiProperty({ example: '1' })
  @IsString()
  seatId: string;

  @ApiPropertyOptional({ example: 45.5, required: false })
  @IsOptional()
  @IsNumberString()
  price?: string;
}
