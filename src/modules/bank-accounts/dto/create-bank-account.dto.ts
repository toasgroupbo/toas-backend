import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

import { Bank, BankAccountType } from '../enums';

export class CreateBankAccountDto {
  @ApiProperty({
    enum: Bank,
    example: Bank.BCP,
  })
  @IsEnum(Bank)
  bank: Bank;

  @ApiProperty({
    enum: BankAccountType,
    example: BankAccountType.CAJA_AHORRO,
  })
  @IsEnum(BankAccountType)
  typeAccount: BankAccountType;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  account: string;
}
