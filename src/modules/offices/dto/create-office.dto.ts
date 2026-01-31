import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString } from 'class-validator';

import { CitiesEnum } from '../enums/places.enum';

export class CreateOfficeDto {
  @ApiProperty({ example: 'url' })
  @IsString()
  url_gps: string;

  /*   @ApiProperty({
    enum: CitiesEnum,
    example: CitiesEnum.SANTA_CRUZ_DE_LA_SIERRA,
  })
  @IsEnum(CitiesEnum)
  @IsString()
  city: CitiesEnum;
 */
  @ApiProperty({
    example: 'central',
  })
  @IsString()
  subsidiary: string;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                     Relations                                                  */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    description: 'Place ID',
    example: '1',
  })
  @IsNumber()
  placeId: number;
}
