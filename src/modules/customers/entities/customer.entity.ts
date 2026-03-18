import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  JoinTable,
  JoinColumn,
  ManyToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AuthProviders } from 'src/auth/enums';

import { Penalty } from './penalty.entity';
import { Billing } from './billing.entity';
import { Passenger } from './passenger.entity';
import { Wallet } from 'src/modules/wallet/entities/wallet.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { unique: true, nullable: true })
  email: string;

  @Column('text', {
    //select: false,
    nullable: true,
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

  @Column('text', { nullable: true })
  sessionToken?: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToMany(() => Ticket, (ticket) => ticket.buyer)
  ticketsBought: Ticket[];

  @ManyToMany(() => Passenger, (passenger) => passenger.customers)
  @JoinTable({
    name: 'customer_passengers',
    joinColumn: {
      name: 'customerId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'passengerId',
      referencedColumnName: 'id',
    },
  })
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

  @OneToOne(() => Wallet, (wallet) => wallet.customer, {
    cascade: true,
    nullable: true,
  })
  wallet?: Wallet;
}
