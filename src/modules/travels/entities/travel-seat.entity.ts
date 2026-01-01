import {
  Column,
  Entity,
  ManyToOne,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SaleType } from '../enums/sale_type-enum';
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

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0' }) //! default 0 (cambiar)
  price: string;

  @Column('varchar', { length: 3, default: '' })
  seatNumber: string;

  @Column({ type: 'text', nullable: true })
  type: SeatType; // 'seat' | 'aisle' | 'space'

  @Column({ type: 'text', default: SaleType.UNSOLD })
  sale_type: SaleType; // 'office' | 'app' | 'unsold'

  @Column({ type: 'text', default: SeatStatus.AVAILABLE })
  status: SeatStatus; // 'available' | 'reserved' | 'sold' | 'unsold'

  @Column({ type: 'timestamptz', nullable: true })
  reserve_expiresAt?: Date | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Ticket, (ticket) => ticket.travelSeats, {
    nullable: true,
  })
  ticket?: Ticket | null; //! puede ser null si el asiento esta disponible

  @ManyToOne(() => Travel, (travel) => travel.travelSeats, {
    onDelete: 'CASCADE', //! se elimina cuando se elimina su travel
  })
  travel: Travel;
}
