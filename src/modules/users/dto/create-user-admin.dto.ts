import { ApiProperty } from '@nestjs/swagger';

import { IsNumber } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateUserAdminDto extends CreateUserDto {
  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    description: 'Role UUID',
    example: '1acd78b9-2eb5-4bdd-8ebb-b87dac87b85a',
  })
  @IsNumber()
  rol: number;
}
