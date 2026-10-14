import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { CurrentPasswordDto } from './current-password.dto';

export class UpdateUserPasswordDto extends CurrentPasswordDto {
  @ApiProperty({
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
