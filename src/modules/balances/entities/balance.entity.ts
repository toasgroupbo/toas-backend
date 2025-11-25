import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { envs } from 'src/config/environments/environments';

import { BalanceType } from '../enums/balance-type.enum';

import { Customer } from 'src/modules/customers/entities/customer.entity';

@Entity('balances')
export class Balance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column('text', { default: BalanceType.RECHARGE })
  type: BalanceType;

  @Column({ type: 'timestamptz', nullable: true }) //! nullable
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Customer, (customer) => customer.balances)
  customer: Customer;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @BeforeInsert()
  setExpirationDate() {
    if (this.type === BalanceType.SPENT) {
      this.expiresAt = null;
    } else {
      const days = envs.BALANCE_EXPIRATION_DAYS || 30;
      const now = new Date();
      const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      this.expiresAt = expires;
    }
  }
}
