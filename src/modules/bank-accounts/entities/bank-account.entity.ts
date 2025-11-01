import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Bank, BankAccountType } from '../enums';

import { Company } from 'src/modules/companies/entities/company.entity';
import { Owner } from 'src/modules/owners/entities/owner.entity';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Bank })
  bank: Bank;

  @Column({ type: 'enum', enum: BankAccountType })
  typeAccount: BankAccountType;

  @Column('text', { unique: true }) //! unique
  account: string;

  @CreateDateColumn({ select: false })
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
