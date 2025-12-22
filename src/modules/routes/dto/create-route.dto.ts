import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateRouteDto {
  @ApiPropertyOptional({
    example: ['Point A', 'Point B', 'Point C'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pass_by: string[];

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    description: 'Office ID',
    example: '1',
  })
  officeOriginId: number;

  @ApiProperty({
    description: 'Office ID',
    example: '2',
  })
  officeDestinationId: number;
}
