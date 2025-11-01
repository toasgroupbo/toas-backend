import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SeatsDto } from './seats.dto';

import { DeckType } from '../enums/deck-type.enum';

export class DeckLayoutDto {
  @ApiProperty({ example: 1 })
  @Min(1)
  @Max(2)
  @IsNumber()
  deck: number;

  @ApiProperty({ enum: DeckType, example: DeckType.LEITO })
  @IsEnum(DeckType)
  deckType: DeckType;

  @ApiProperty({ type: [SeatsDto] })
  @ValidateNested({ each: true })
  @Type(() => SeatsDto)
  seats: SeatsDto[];
}
