import { ApiProperty } from '@nestjs/swagger';

import { IsString, IsUUID } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateUserCashierDto extends CreateUserDto {
  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    description: 'Office ID',
    example: '1acd78b9-2eb5-4bdd-8ebb-b87dac87b85a',
  })
  @IsString()
  @IsUUID()
  officeId: number;
}
