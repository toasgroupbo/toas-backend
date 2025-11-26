import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BankAccount } from 'src/modules/bank-accounts/entities/bank-account.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import { Bus } from 'src/modules/buses/entities/bus.entity';

@Entity('owners')
export class Owner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('text', { unique: true }) //! unique
  ci: string;

  @Column('text')
  phone: string;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @OneToOne(() => BankAccount, (account) => account.company, { cascade: true })
  @JoinColumn()
  bankAccount: BankAccount;

  @OneToMany(() => Bus, (bus) => bus.owner, { cascade: true })
  buses: Bus[];

  @ManyToMany(() => Company, (company) => company.owners)
  companies: Company[];
}
