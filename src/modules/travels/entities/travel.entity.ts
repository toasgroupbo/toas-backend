import {
  Entity,
  ManyToOne,
  OneToMany,
  DeleteDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

import { TravelType } from '../enums/travel-type.enum';
import { TravelStatus } from '../enums/travel-status.enum';

import { TravelSeat } from './travel-seat.entity';
import { Bus } from 'src/modules/buses/entities/bus.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Route } from 'src/modules/routes/entities/route.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';

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

  @Column({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Bus, (bus) => bus.travels) //() => Travel, (travel) => travel.tickets
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
