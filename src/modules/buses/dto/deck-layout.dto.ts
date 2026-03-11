import { ApiProperty } from '@nestjs/swagger';
import {
  Min,
  Max,
  IsEnum,
  Matches,
  IsNumber,
  IsString,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

//import { DeckType } from '../enums/deck-type.enum';

import { SeatsDto } from './seats.dto';

export enum DeckType {
  LEITO = 'LEITO',
  SEMICAMA = 'SEMICAMA',
  CAMA = 'CAMA',
  MIXTO = 'MIXTO',
  SUIT_CAMA = 'suit_cama',
}

export class DeckLayoutDto {
  @ApiProperty()
  @Min(1)
  @Max(2)
  @IsNumber()
  deck: number;

  @ApiProperty({
    example: '10.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/)
  price: string;

  @ApiProperty({ enum: DeckType })
  @IsEnum(DeckType)
  deckType: DeckType;

  @ApiProperty({ type: [SeatsDto] })
  @ValidateNested({ each: true })
  @Type(() => SeatsDto)
  seats: SeatsDto[];
}
