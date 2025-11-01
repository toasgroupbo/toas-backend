import {
  Column,
  Entity,
  OneToMany,
  BeforeInsert,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AuthProviders } from 'src/auth/enums';

import { Ticket } from '../../../modules/tickets/entities/ticket.entity';
import { Balance } from 'src/modules/balances/entities/balance.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true, nullable: true }) //! unique, nullable
  email: string;

  @Column('text', {
    select: false,
    nullable: true,
  })
  password?: string;

  @Column('text') //! null
  name: string;

  @Column('text', { unique: true, nullable: true }) //! unique
  ci?: string;

  @Column('text', { nullable: true }) //! null
  phone?: string;

  @Column('boolean', { default: false })
  is_verified: boolean;

  @Column({ type: 'enum', enum: AuthProviders, nullable: true }) //! null
  provider?: AuthProviders;

  @Column('text', { nullable: true }) //! null
  idProvider?: string;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @OneToMany(() => Ticket, (ticket) => ticket.buyer)
  ticketsBought: Ticket[];

  @OneToMany(() => Balance, (balance) => balance.customer)
  balances: Balance[];

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @BeforeInsert()
  hashingPassword() {
    if (this.password) this.password = bcrypt.hashSync(this.password, 10);
  }
}
