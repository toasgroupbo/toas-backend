import {
  Column,
  Entity,
  OneToOne,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Bank, BankAccountType } from '../enums';

import { Owner } from 'src/modules/owners/entities/owner.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { nullable: true })
  bank: Bank;

  @Column('text', { nullable: true })
  typeAccount: BankAccountType;

  @Column('text', { unique: true }) //! unique
  account: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @OneToOne(() => Company, (company) => company.bankAccount)
  company: Company;

  @OneToOne(() => Owner, (owner) => owner.bankAccount)
  owner: Owner;
}
