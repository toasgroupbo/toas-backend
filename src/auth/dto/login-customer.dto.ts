import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginCustomerDto {
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
  password: string; //! solo para pruebas
}
