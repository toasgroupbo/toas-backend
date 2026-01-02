import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

import { SelectedSeatsDto } from '../dto';

import { TicketType } from '../enums/ticket-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

import { User } from 'src/modules/users/entities/user.entity';
import { Travel } from 'src/modules/travels/entities/travel.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { TravelSeat } from 'src/modules/travels/entities/travel-seat.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: TicketType.IN_OFFICE })
  type: TicketType;

  @Column({ type: 'text', default: TicketStatus.RESERVED })
  status: TicketStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: string;

  @Column('json')
  seats: SelectedSeatsDto[];

  @Index()
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
