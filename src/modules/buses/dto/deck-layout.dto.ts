import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { SeatsDto } from './seats.dto';

import { DeckType } from '../enums/deck-type.enum';

export class DeckLayoutDto {
  @ApiProperty({ example: 1 })
  @Min(1)
  @Max(2)
  @IsNumber()
  deck: number;

  @ApiProperty({ example: '/api/files/imagen1.jpeg' })
  @IsString()
  image: string;

  @ApiProperty({ enum: DeckType, example: DeckType.LEITO })
  @IsEnum(DeckType)
  deckType: DeckType;

  @ApiProperty({ type: [SeatsDto] })
  @ValidateNested({ each: true })
  @Type(() => SeatsDto)
  seats: SeatsDto[];
}
