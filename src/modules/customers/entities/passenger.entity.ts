import {
  Column,
  Entity,
  ManyToOne,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Customer } from './customer.entity';

@Entity('passengers')
export class Passenger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  fullName: string;

  @Column('text', { unique: true })
  ci: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */
  @ManyToOne(() => Customer, (customer) => customer.passengers, {
    onDelete: 'CASCADE',
  })
  customer: Customer;
}
