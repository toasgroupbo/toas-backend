import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { AuthProviders } from 'src/auth/enums';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'juan',
  })
  @IsString()
  name: string;

  @ApiProperty({ example: '32423534' })
  @IsOptional()
  @IsString()
  ci?: string;

  @ApiHideProperty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiHideProperty()
  @IsEnum(AuthProviders)
  provider: AuthProviders; //! Enum

  @ApiHideProperty()
  @IsString()
  idProvider: string;
}
