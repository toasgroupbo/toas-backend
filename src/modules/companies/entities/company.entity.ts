import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { BankAccount } from 'src/modules/bank-accounts/entities/bank-account.entity';
import { Office } from 'src/modules/offices/entities/office.entity';
import { Owner } from 'src/modules/owners/entities/owner.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Bus } from 'src/modules/buses/entities/bus.entity';

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

  @OneToMany(() => Bus, (bus) => bus.company)
  buses: Office[];

  /* @OneToMany(() => Owner, (owner) => owner.company)
  owner: Owner[]; */

  @ManyToMany(() => Owner, (owner) => owner.companies, {})
  @JoinTable({
    name: 'company_owners', // nombre de la tabla intermedia
    joinColumn: {
      name: 'companyId', // columna FK hacia Outfit
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'ownerId', // columna FK hacia Variant
      referencedColumnName: 'id',
    },
  })
  owners: Owner[];

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */
}
