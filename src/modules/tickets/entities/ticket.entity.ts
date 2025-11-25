import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SelectedSeatsDto } from '../dto';

import { TicketStatus } from '../enums/ticket-status.enum';
import { TicketType } from '../enums/ticket-type.enum';

import { TravelSeat } from 'src/modules/travels/entities/travel-seat.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { Travel } from 'src/modules/travels/entities/travel.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', default: TicketType.IN_OFFICE })
  type: TicketType;

  @Column({ type: 'text', default: TicketStatus.RESERVED })
  status: TicketStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: string;

  @Column('json')
  seats: SelectedSeatsDto[];

  @Column({ type: 'timestamptz', nullable: true })
  reserve_expiresAt?: Date | null;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Travel, (travel) => travel.tickets, { onDelete: 'CASCADE' })
  travel: Travel;

  @OneToMany(() => TravelSeat, (travelSeat) => travelSeat.ticket, {
    cascade: true,
  })
  travelSeats: TravelSeat[];

  @ManyToOne(() => User, (user) => user.ticketsSold, {
    nullable: true, //! permitir null si la venta fue online
    onDelete: 'SET NULL',
  })
  soldBy?: User | null;

  @ManyToOne(() => Customer, (customer) => customer.ticketsBought, {
    //onDelete: 'SET NULL',
  })
  buyer: Customer;
}
