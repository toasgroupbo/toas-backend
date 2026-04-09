import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  JoinTable,
  JoinColumn,
  ManyToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Bus } from 'src/modules/buses/entities/bus.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Owner } from 'src/modules/owners/entities/owner.entity';
import { Travel } from 'src/modules/travels/entities/travel.entity';
import { Office } from 'src/modules/offices/entities/office.entity';
import { BankAccount } from 'src/modules/bank-accounts/entities/bank-account.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  name: string;

  @Column('text')
  logo: string;

  @Column({ type: 'int' })
  commission: number;

  @Column({ type: 'int' })
  hours_before_closing: number;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

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

  @OneToMany(() => Bus, (bus) => bus.company, { cascade: true })
  buses: Bus[];

  @ManyToMany(() => Owner, (owner) => owner.companies, { cascade: true })
  @JoinTable({
    name: 'company_owners',
    joinColumn: {
      name: 'companyId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'ownerId',
      referencedColumnName: 'id',
    },
  })
  owners: Owner[];

  @OneToMany(() => Travel, (travel) => travel.company)
  travels: Travel[];
}
