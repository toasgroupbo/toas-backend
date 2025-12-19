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

import { Balance } from 'src/modules/balances/entities/balance.entity';
import { Ticket } from '../../../modules/tickets/entities/ticket.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { unique: true, nullable: true })
  email: string;

  @Column('text', {
    select: false,
    nullable: true,
  })
  password?: string;

  @Column('text')
  name: string;

  @Column('text', { unique: true, nullable: true })
  ci?: string;

  @Column('text', { nullable: true })
  phone?: string;

  @Column('boolean', { default: false })
  is_verified: boolean;

  @Column({ type: 'enum', enum: AuthProviders, nullable: true })
  provider?: AuthProviders;

  @Column('text', { nullable: true })
  idProvider?: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
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
