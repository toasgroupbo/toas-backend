import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginCustomerDto {
  @ApiProperty({
    example: 'customer@gmail.com',
  })
  @IsString()
  @IsString()
  @IsEmail()
  email: string;
}
