import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateOfficeDto {
  @ApiProperty({ example: 'url' })
  @IsString()
  url_gps: string;

  @ApiProperty({ example: 'Nombre de la office' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Direccion' })
  @IsString()
  address: string;

  //* ============================================================================================== */
  //*                                     Relations                                                  */
  //* ============================================================================================== */

  @ApiProperty({
    description: 'Place ID',
    example: '1',
  })
  @IsNumber()
  placeId: number;
}
