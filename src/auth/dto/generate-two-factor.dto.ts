import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GenerateTwoFactorDto {
  @ApiProperty({
    example: '123456',
    description: 'Contraseña actual del usuario',
  })
  @IsString()
  password: string;
}
