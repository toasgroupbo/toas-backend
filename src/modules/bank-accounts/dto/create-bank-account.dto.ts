import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

import { Bank } from '../enums/bank.enum';

import { BankAccountType } from '../entities/bank-account.entity';

export class CreateBankAccountDto {
  @ApiProperty({ example: '1234567890' })
  @IsString()
  account: string;

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
}
