import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Bus } from 'src/modules/buses/entities/bus.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import { BankAccount } from 'src/modules/bank-accounts/entities/bank-account.entity';
import { CompanyOwner } from 'src/modules/companies/entities/company-owners.entity';

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

  @Column('boolean', { default: true })
  enabled: boolean;

  /* @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date; */

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToOne(() => BankAccount, (account) => account.company, { cascade: true })
  @JoinColumn()
  bankAccount: BankAccount;

  @OneToMany(() => Bus, (bus) => bus.owner, { cascade: true })
  buses: Bus[];

  @OneToMany(() => CompanyOwner, (companyOwner) => companyOwner.owner)
  companyOwner: CompanyOwner[];

  @OneToMany(() => User, (user) => user.owner)
  users: User[];
}
