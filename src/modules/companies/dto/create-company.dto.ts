import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Min,
  Max,
  IsInt,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

import { CreateUserDto } from 'src/modules/users/dto';
import { CreateBankAccountDto } from 'src/modules/bank-accounts/dto/create-bank-account.dto';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Empresa XYZ' })
  @IsString()
  name: string;

  @ApiProperty({ example: '/api/files/imagen1.jpeg' })
  @IsString()
  logo: string;

  @ApiProperty({
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsInt()
  commission: number;

  @ApiProperty({
    example: 3,
    minimum: 0,
    maximum: 5,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsInt()
  hours_before_closing: number;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ApiProperty({
    type: () => CreateBankAccountDto,
    description: 'bank account of the company',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  bankAccount: CreateBankAccountDto;

  @ApiProperty({
    type: CreateUserDto,
  })
  @ValidateNested({ each: true })
  @Type(() => CreateUserDto)
  manager: CreateUserDto;
}
