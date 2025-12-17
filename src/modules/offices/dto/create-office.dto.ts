import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';

import { CitiesEnum } from '../enums/places.enum';

export class CreateOfficeDto {
  @ApiProperty({ example: 'url' })
  @IsString()
  url_gps: string;

  @ApiProperty({
    enum: CitiesEnum,
    example: CitiesEnum.SANTA_CRUZ_DE_LA_SIERRA,
  })
  @IsEnum(CitiesEnum)
  @IsString()
  city: CitiesEnum;

  @ApiProperty({
    description: 'Place UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  place: string;
}
