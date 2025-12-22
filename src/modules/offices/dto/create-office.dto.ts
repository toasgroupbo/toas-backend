import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

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

  //* ---------------------------------------------------------------------------------------------- */
  //*                                     Relations                                                  */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    description: 'Place ID',
    example: '1',
  })
  @IsString()
  placeId: number;
}
