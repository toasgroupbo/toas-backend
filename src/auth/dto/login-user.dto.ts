import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    example: 'user@gmail.com',
  })
  @IsString()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
  })
  @IsString()
  @IsString()
  password: string;

  /*   @ApiProperty({
    description: 'type of user',
    enum: LoginType,
    example: LoginType.user,
  })
  @IsString()
  @IsEnum(LoginType)
  type: string; */
}
