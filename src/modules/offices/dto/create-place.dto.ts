import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePlaceDto {
  @ApiProperty({ example: 'name of place' })
  @IsString()
  name: string;
}
