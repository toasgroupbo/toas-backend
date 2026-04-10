import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  DeleteDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TravelType, TravelStatus } from '../enums';

import { TravelSeat } from './travel-seat.entity';
import { Bus } from 'src/modules/buses/entities/bus.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Route } from 'src/modules/routes/entities/route.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { Company } from 'src/modules/companies/entities/company.entity';
import { Transaction } from 'src/modules/transactions/entities/transaction.entity';

@Entity('travels')
export class Travel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamptz' })
  departure_time: Date;

  @Column({ type: 'timestamptz' })
  arrival_time: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_deck_1: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  price_deck_2?: string;

  @Column({ type: 'text', default: TravelStatus.ACTIVE })
  travel_status: TravelStatus;

  @Column({ type: 'text', default: TravelType.NORMAL })
  type: TravelType;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    select: false,
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  //!Montos

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: string; //! Suma de todos los tickets (total_price)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_commission: string; //! Suma de todas las comisiones (solo tickets app)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  net_to_company: string; //! total_revenue - total_commission

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cash_amount: string; //! Suma de tickets pagados en CASH

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  qr_amount: string; //! Suma de tickets pagados con QR (app)

  @Column({ type: 'int', default: 0 })
  sold_tickets_count: number; //! Cantidad de tickets vendidos

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToOne(() => Bus, (bus) => bus.travels)
  bus: Bus;

  @OneToMany(() => TravelSeat, (seat) => seat.travel, {
    cascade: true,
  })
  travelSeats: TravelSeat[];

  @OneToMany(() => Ticket, (ticket) => ticket.travel)
  tickets: Ticket[];

  @ManyToOne(() => Route, (route) => route.travel)
  route: Route;

  @ManyToOne(() => User, { nullable: true })
  closedBy?: User | null;

  @ManyToOne(() => User, { nullable: true })
  createdBy?: User | null;

  @ManyToOne(() => Company, (company) => company.travels)
  company: Company;

  @ManyToOne(() => Transaction, (transaction) => transaction.travels, {
    nullable: true,
  })
  transaction?: Transaction;
}
