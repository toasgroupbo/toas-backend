import {
  Column,
  Entity,
  ManyToOne,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SeatStatus, SeatType } from '../../../common/enums';

import { Travel } from './travel.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';

@Entity('travel_seats')
export class TravelSeat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  row: number;

  @Column('int')
  column: number;

  @Column('int')
  deck: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0' })
  price: string;

  @Column('varchar', { length: 3, default: '' })
  seatNumber: string;

  @Column({ type: 'text', nullable: true })
  type: SeatType;

  @Column({ type: 'text', default: SeatStatus.AVAILABLE })
  status: SeatStatus;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @Column('jsonb', { nullable: true })
  passenger?: {
    name: string;
    ci: string;
  } | null;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToOne(() => Ticket, (ticket) => ticket.travelSeats, {
    nullable: true,
  })
  ticket?: Ticket | null;

  @ManyToOne(() => Travel, (travel) => travel.travelSeats, {
    onDelete: 'CASCADE',
  })
  travel: Travel;
}
