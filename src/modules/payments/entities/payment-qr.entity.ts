import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Ticket } from 'src/modules/tickets/entities/ticket.entity';

@Entity('payments-qr')
export class PaymentQR {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  qrId: number;

  @Column('text')
  qrImage: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({
    type: 'text',
  })
  expirationDate: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToOne(() => Ticket, (ticket) => ticket.paymentQr)
  //@JoinColumn()
  ticket: Ticket;
}
