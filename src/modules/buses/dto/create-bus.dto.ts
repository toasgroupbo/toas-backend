import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateBusTypeDto } from './create-bus-type.dto';

import { Equipment } from '../enums';

export class CreateBusDto {
  @ApiProperty({
    description: 'Bus Name',
    example: 'Bus 1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'ABC-1234',
  })
  @IsString()
  plaque: string;

  @ApiProperty({
    description: 'equipamiento del bus',
    enum: Equipment,
    isArray: true,
    example: [Equipment.WIFI, Equipment.USB_CHARGER],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Equipment, { each: true })
  @Type(() => String)
  equipment: Equipment[];

  @ApiProperty({ example: '/api/files/imagen1.jpeg' })
  @IsString()
  interior_image: string;

  @ApiProperty({ example: '/api/files/imagen2.jpeg' })
  @IsString()
  exterior_image: string;

  @ApiProperty({ example: 'NISSAN' })
  @IsString()
  brand: string;

  @ApiProperty({ example: '2025' })
  @IsString()
  model: string;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    type: () => CreateBusTypeDto,
    description: 'Type of the bus',
  })
  @ValidateNested()
  @Type(() => CreateBusTypeDto)
  busType: CreateBusTypeDto;

  @ApiProperty({
    description: 'Owner ID',
    example: '1',
  })
  ownerId: number;
}
