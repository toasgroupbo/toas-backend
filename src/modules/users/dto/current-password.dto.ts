import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

//! contraseña de quien hace la acción (no la del usuario editado), para confirmar la edición
export class CurrentPasswordDto {
  @ApiProperty({
    description: 'Password of the logged-in user, to confirm the action',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;
}
