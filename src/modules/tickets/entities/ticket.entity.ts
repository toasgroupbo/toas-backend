import {
  Index,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SelectedSeatsDto } from '../dto';

import { TicketType } from '../enums/ticket-type.enum';
import { PaymentType } from '../enums/payment-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

import { Billing } from './billing.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Travel } from 'src/modules/travels/entities/travel.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { PaymentQR } from 'src/modules/payments/entities/payment-qr.entity';
import { TravelSeat } from 'src/modules/travels/entities/travel-seat.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: TicketType.IN_OFFICE })
  type: TicketType;

  @Column({ type: 'text', default: PaymentType.CASH })
  payment_type: PaymentType;

  @Column({ type: 'text', default: TicketStatus.RESERVED })
  status: TicketStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  wallet_amount: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  qr_amount: string;

  @Column('json')
  seats: SelectedSeatsDto[];

  @Column('boolean', { default: false })
  past: boolean;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  reserve_expiresAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  cancelledAt?: Date | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToOne(() => Travel, (travel) => travel.tickets, { onDelete: 'CASCADE' })
  travel: Travel;

  @OneToMany(() => TravelSeat, (travelSeat) => travelSeat.ticket, {
    cascade: true,
  })
  travelSeats: TravelSeat[];

  @ManyToOne(() => User, (user) => user.ticketsSold, {
    onDelete: 'SET NULL',
    nullable: true, //! permitir null si la venta fue online
  })
  soldBy?: User;

  @ManyToOne(() => User, (user) => user.ticketsSold, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  canceledBy?: User | null;

  @ManyToOne(() => Customer, (customer) => customer.ticketsBought, {
    nullable: true, //! permitir null si la venta fue en oficina
  })
  buyer?: Customer;

  @OneToOne(() => PaymentQR, (paymentQr) => paymentQr.ticket, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  paymentQr?: PaymentQR;

  @ManyToOne(() => Billing, (billing) => billing.tickets, { nullable: true }) //! nullable momentaneo
  billing: Billing | null;
}
