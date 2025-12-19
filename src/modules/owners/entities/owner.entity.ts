import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Bus } from 'src/modules/buses/entities/bus.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import { BankAccount } from 'src/modules/bank-accounts/entities/bank-account.entity';

@Entity('owners')
export class Owner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  name: string;

  @Column('text', { unique: true })
  ci: string;

  @Column('text')
  phone: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
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
