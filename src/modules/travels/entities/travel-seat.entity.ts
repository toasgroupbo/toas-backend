import {
  Column,
  Entity,
  ManyToOne,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SeatStatus, SeatType } from '../../../common/enums';
import { TravelStatus } from '../enums/travel-status.enum';

import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { Travel } from './travel.entity';
import { SaleType } from '../enums/sale_type-enum';

@Entity('travel_seats')
export class TravelSeat {
  @PrimaryGeneratedColumn()
  id: string;

  @Column('int')
  row: number;

  @Column('int')
  column: number;

  @Column('int')
  deck: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0' }) //! default 0 (cambiar)
  price: string;

  @Column('varchar', { length: 3, nullable: true })
  seatNumber?: string;

  @Column({ type: 'enum', enum: SeatType })
  type: SeatType; // 'seat' | 'aisle' | 'space'

  @Column({ type: 'enum', enum: SaleType, default: SaleType.UNSOLD })
  sale_type: SaleType; // 'office' | 'app'

  @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
  status: SeatStatus; // 'available' | 'reserved' | 'sold'

  @Column({ type: 'enum', enum: TravelStatus, default: TravelStatus.ACTIVE })
  travel_status: TravelStatus; // 'active' | 'cancelled' | 'completed' | 'closed'

  @Column({ type: 'timestamptz', nullable: true })
  reserve_expiresAt?: Date | null;

  @CreateDateColumn({ select: false })
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
