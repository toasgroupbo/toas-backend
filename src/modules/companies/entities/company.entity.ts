import {
  Entity,
  Column,
  OneToOne,
  OneToMany,
  JoinTable,
  JoinColumn,
  ManyToMany,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CompanyOwner } from './company-owners.entity';
import { Bus } from 'src/modules/buses/entities/bus.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Staff } from 'src/modules/travels/entities/staff.entity';
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

  @Column({ type: 'int', default: 0 })
  commission_app: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_company: string;

  @Column({ type: 'int' })
  hours_before_closing: number;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @Column('boolean', { default: true })
  enabled: boolean;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToOne(() => BankAccount, (account) => account.company, { cascade: true })
  @JoinColumn()
  bankAccount: BankAccount;

  @OneToMany(() => User, (user) => user.company, { cascade: true })
  users: User[];

  @OneToMany(() => Office, (office) => office.company)
  offices: Office[];

  @OneToMany(() => Bus, (bus) => bus.company, { cascade: true })
  buses: Bus[];

  @OneToMany(() => CompanyOwner, (companyOwner) => companyOwner.company)
  companyOwner: CompanyOwner[];

  @OneToMany(() => Travel, (travel) => travel.company)
  travels: Travel[];

  @ManyToMany(() => Staff, (staff) => staff.companies)
  @JoinTable({
    name: 'company_staff',
    joinColumn: { name: 'companyId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'staffId', referencedColumnName: 'id' },
  })
  staff: Staff[];

}
