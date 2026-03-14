import {
  Column,
  Entity,
  OneToOne,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { QrCallbackResponse } from '../interfaces/qr-callback-response.interface';
import { WalletTransaction } from 'src/modules/wallet/entities/wallet-transactions.entity';

export enum PaymentStatusEnum {
  PAID = 'PAID',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
}

export enum QrPaymentTypeEnum {
  TICKET = 'TICKET',
  WALLET_RECHARGE = 'WALLET_RECHARGE',
}

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

  @Column('text', { unique: true })
  IdCorrelation: string;

  @Column({ type: 'text' })
  state: string;

  @Column({ type: 'text' })
  message: string;

  @Column('jsonb', { nullable: true })
  data: QrCallbackResponse;

  @Column('text', { default: PaymentStatusEnum.PENDING })
  status: PaymentStatusEnum;

  @Column('text')
  payment_type: QrPaymentTypeEnum;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToOne(() => Ticket, (ticket) => ticket.paymentQr, { nullable: true })
  ticket?: Ticket | null;

  @OneToOne(() => WalletTransaction, (transaction) => transaction.paymentQr, {
    nullable: true,
  })
  walletTransaction?: WalletTransaction | null;
}
