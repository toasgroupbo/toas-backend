import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { SeatsDto } from './seats.dto';

import { DeckType } from '../enums/deck-type.enum';

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
