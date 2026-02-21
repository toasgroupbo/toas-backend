import {
  Column,
  Entity,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';

import * as bcrypt from 'bcrypt';

import { AuthProviders } from 'src/auth/enums';

import { Penalty } from './penalty.entity';
import { Billing } from './billing.entity';
import { Passenger } from './passenger.entity';
import { Balance } from 'src/modules/balances/entities/balance.entity';
import { Ticket } from '../../../modules/tickets/entities/ticket.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { unique: true, nullable: true })
  email: string;

  @Column('text', {
    //select: false,
  })
  password: string; //! solo para pruebas

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

  @Column({ type: 'date', nullable: true })
  birthDate?: Date;

  @Column('text', { nullable: true })
  photo?: string;

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

  @OneToMany(() => Passenger, (passenger) => passenger.customer)
  passengers: Passenger[];

  @OneToOne(() => Billing, (billing) => billing.customer, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  billing?: Billing;

  @OneToOne(() => Penalty, (penalty) => penalty.customer, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  penalty?: Penalty;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @BeforeInsert()
  hashingPassword() {
    this.password = bcrypt.hashSync(this.password, 10);
  }
}
