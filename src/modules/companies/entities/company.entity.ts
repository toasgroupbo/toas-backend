import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { User } from 'src/modules/users/entities/user.entity';
import { Owner } from 'src/modules/owners/entities/owner.entity';
import { Office } from 'src/modules/offices/entities/office.entity';
import { BankAccount } from 'src/modules/bank-accounts/entities/bank-account.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('text', { default: '' })
  logo: string;

  @Column({ type: 'int', default: 0 })
  commission: number;

  @Column({ type: 'int', default: 0 })
  hours_before_closing: number;

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

  @OneToOne(() => User, (user) => user.company, {
    nullable: false,
    cascade: true,
  })
  @JoinColumn()
  admin: User;

  @OneToMany(() => Office, (office) => office.company)
  offices: Office[];

  @OneToMany(() => Owner, (owner) => owner.company)
  owner: Owner[];

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */
}
