import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { BcpQrCallbackDto } from '../interfaces/response-qr-callback.interface';
import { PaymentStatusEnum } from '../enum/payment-status.enum';

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

  @Column({ type: 'text' })
  expirationDate: string;

  @Column('text', { unique: true, nullable: true })
  IdCorrelation: string;

  @Column({ type: 'text', nullable: true })
  state: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column('jsonb', { nullable: true })
  data: BcpQrCallbackDto;

  @Column('text', { default: PaymentStatusEnum.PENDING, nullable: true })
  status: PaymentStatusEnum;

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
