import {
  Column,
  Entity,
  OneToOne,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Bank } from '../enums/bank.enum';

import { Owner } from 'src/modules/owners/entities/owner.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

export enum BankAccountType {
  CAJA_AHORRO = 'caja_ahorro',
  CUENTA_CORRIENTE = 'cuenta_corriente',
  OTRA = 'otro',
}

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  bank: Bank;

  @Column('text')
  typeAccount: BankAccountType;

  @Column('text', { unique: true })
  account: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToOne(() => Company, (company) => company.bankAccount)
  company: Company;

  @OneToOne(() => Owner, (owner) => owner.bankAccount)
  owner: Owner;
}
