import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRouteDto {
  @ApiPropertyOptional({
    example: ['Point A', 'Point B', 'Point C'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pass_by: string[];

  @ApiProperty({
    example: 5,
  })
  @IsInt()
  @IsNumber()
  travel_hours: number;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    description: 'Office ID',
    example: '1',
  })
  @IsNumber()
  officeOriginId: number;

  @ApiProperty({
    description: 'Office ID',
    example: '2',
  })
  @IsNumber()
  officeDestinationId: number;
}
