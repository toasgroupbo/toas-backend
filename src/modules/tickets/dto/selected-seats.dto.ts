import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

//! para guaradar en la entity
export class SelectedSeatsDto {
  id?: number; //! id del travel_seat

  @IsString()
  seatNumber: string;

  @IsNumberString()
  price: string;

  //! copia del pasajero: el travel_seat lo borra al cancelar/vencer el ticket
  passenger?: { name: string; ci: string } | null;
}

//! para la creacion del ticket para el cajero
export class SeatSelectionInOfficeDto {
  @ApiProperty({ example: '1' })
  @IsString()
  seatId: string;

  @ApiPropertyOptional({ example: 45.5, required: false })
  @IsOptional()
  @IsNumberString()
  price?: string;
}

//! para la creacion del ticket para la app
export class SeatSelectionInAppDto {
  @ApiProperty({ example: '1' })
  @IsString()
  seatId: string;
}
