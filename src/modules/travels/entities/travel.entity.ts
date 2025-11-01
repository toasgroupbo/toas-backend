import {
  Entity,
  ManyToOne,
  OneToMany,
  DeleteDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { Route } from 'src/modules/routes/entities/route.entity';
import { Bus } from 'src/modules/buses/entities/bus.entity';
import { TravelSeat } from './travel-seat.entity';
import { TravelStatus } from '../enums/travel-status.enum';

@Entity('travels')
export class Travel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'enum', enum: TravelStatus, default: TravelStatus.ACTIVE })
  travel_status: TravelStatus;

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
}
