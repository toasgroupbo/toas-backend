import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { CurrentPasswordDto } from './current-password.dto';

export class UpdateMyPasswordDto extends CurrentPasswordDto {
  @ApiProperty({
    example: '654321',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  newPassword: string;
}
