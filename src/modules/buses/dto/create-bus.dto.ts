import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
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
    description: 'Owner UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  owner: string;
}
