import {
  Entity,
  ManyToOne,
  OneToMany,
  DeleteDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

import { TravelStatus } from '../enums/travel-status.enum';

import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { Route } from 'src/modules/routes/entities/route.entity';
import { Bus } from 'src/modules/buses/entities/bus.entity';
import { TravelSeat } from './travel-seat.entity';
import { User } from 'src/modules/users/entities/user.entity';

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
  status: TravelStatus;

  @Column({ type: 'boolean', default: false })
  closedAutomatically: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Bus)
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
}
