import {
  Index,
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Wallet } from './wallet.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { PaymentQR } from 'src/modules/payments/entities/payment-qr.entity';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  EXPIRED = 'expired',
}

@Index(['wallet', 'createdAt'])
@Index(['expiresAt'])
@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  type: TransactionType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  balanceAfter: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  remainingAmount?: string | null;

  @Column('jsonb', { nullable: true })
  metadata?: {
    usedCredits?: { creditId: number; amount: number }[];
    originalCreditId?: number;
    reversedAt?: string;
    reversedBecause?: string;
    [key: string]: any;
  } | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  expiresAt?: Date | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  wallet: Wallet;

  @ManyToOne(() => Ticket, { nullable: true, onDelete: 'SET NULL' })
  ticket?: Ticket | null;

  @OneToOne(() => PaymentQR, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  paymentQr?: PaymentQR | null;
}
