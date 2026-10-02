import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@gmail.com',
  })
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'token recibido en el link del correo',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  newPassword: string;
}
