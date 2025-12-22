import { ApiProperty } from '@nestjs/swagger';

import { IsNumber } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateUserAdminDto extends CreateUserDto {
  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    description: 'Role ID',
    example: '1',
  })
  @IsNumber()
  rol: number;
}
