import {
  Column,
  Entity,
  OneToOne,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BankCode } from '../enums/bank-code.enum';

import { Owner } from 'src/modules/owners/entities/owner.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

export enum DocumentExtension {
  CB = 'CB',
  LP = 'LP',
  SC = 'SC',
  OR = 'OR',
  PT = 'PO',
  TJ = 'TJ',
  CH = 'CH',
  BE = 'BE',
  PA = 'PA',
  SN = 'SN',
  NN = 'NN',
}

export enum DocumentType {
  CI = 'Q',
  NIT = 'T',
  RUC = 'R',
  OTHER = 'O',
  PASSPORT = 'P',
  FISCAL_ID = 'U',
  BANK_GENERIC = 'W',
}

export enum BranchOfficeId {
  CHUQUISACA = 101,
  LA_PAZ = 201,
  COCHABAMBA = 301,
  ORURO = 401,
  POTOSI = 501,
  TARIJA = 601,
  SANTA_CRUZ = 701,
  BENI = 801,
  PANDO = 901,
  NA = 999,
}

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', enum: BankCode })
  bankCode: BankCode;

  @Column('text', { unique: true, nullable: true }) //!
  account: string;

  @Column('text', { nullable: true }) //!
  titularName: string;

  @Column('int', { nullable: true }) //!
  branchOfficeId: BranchOfficeId;

  @Column('text', { nullable: true }) //!
  documentNumber: string;

  @Column('text', { nullable: true }) //!
  documentType: DocumentType;

  @Column('text', { default: '' })
  documentExtension: DocumentExtension;

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
