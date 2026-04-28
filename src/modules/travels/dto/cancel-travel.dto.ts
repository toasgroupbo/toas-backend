import { ApiProperty } from '@nestjs/swagger';

import { IsString, MinLength, MaxLength } from 'class-validator';

export class CancelTravelDto {
  @ApiProperty({
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
