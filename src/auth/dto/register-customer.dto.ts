import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @ApiProperty({
    example: 'Juan Perez',
  })
  @IsString()
  name: string;

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
  password: string; //! solo para pruebas

  @ApiProperty({ example: '32423534', required: false })
  @IsOptional()
  @IsString()
  ci?: string;
}
