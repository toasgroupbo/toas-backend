import { ApiProperty } from '@nestjs/swagger';

import { IsNumber } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateUserCashierDto extends CreateUserDto {
  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ApiProperty({
    description: 'Role Cashier ID',
    example: 1,
  })
  @IsNumber()
  cashierRol: number;

  @ApiProperty({
    description: 'Office ID',
    example: 1,
  })
  @IsNumber()
  officeId: number;
}
