import { ApiProperty } from '@nestjs/swagger';

import { IsNumber, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateUserCashierDto extends CreateUserDto {
  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ApiProperty({
    description: 'Office ID',
    example: '1',
  })
  @IsNumber()
  officeId: number;
}
