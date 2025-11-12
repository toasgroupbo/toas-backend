import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserPasswordDto {
  @ApiProperty({
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
