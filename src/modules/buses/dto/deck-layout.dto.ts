import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SeatsDto } from './seats.dto';

import { DeckType } from '../enums/deck-type.enum';

export class DeckLayoutDto {
  @ApiProperty()
  @Min(1)
  @Max(2)
  @IsNumber()
  deck: number;

  @ApiProperty({ enum: DeckType })
  @IsEnum(DeckType)
  deckType: DeckType;

  @ApiProperty({ type: [SeatsDto] })
  @ValidateNested({ each: true })
  @Type(() => SeatsDto)
  seats: SeatsDto[];
}
