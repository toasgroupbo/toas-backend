import { ApiProperty } from '@nestjs/swagger';

import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateUserDto {
  @ApiProperty({
    example: 'user@gmail.com',
  })
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @ApiProperty({
    example: 'username',
  })
  @IsString()
  @MinLength(1)
  fullName: string;

  @ApiProperty({
    example: '11726358',
  })
  @IsString()
  ci: string;

  @ApiProperty({
    example: '76565243',
  })
  @IsString()
  phone: string;
}
