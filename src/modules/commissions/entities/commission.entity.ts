import {
  Index,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from 'src/modules/companies/entities/company.entity';

@Index(['company', 'period_key'], { unique: true })
@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn()
  id: number;

  //? ============================================================================================== */

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  paid: string;

  @Column('text', { nullable: true })
  voucher: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  //? ============================================================================================== */

  @Column({ type: 'int', default: 0 })
  total_trips_count: number;

  @Column({ type: 'int' })
  tickets_app_count_total: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_app_total: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_company: string;

  @Column({ type: 'int' })
  commission_rate_at_time: number;

  @Column({ type: 'timestamptz' })
  date_to_pay: Date;

  @Column({ type: 'timestamptz', nullable: true })
  period_start: Date;

  @Column({ type: 'timestamptz', nullable: true })
  period_end: Date;

  @Column({ type: 'varchar', length: 7, nullable: true })
  period_key: string;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToOne(() => Company, (company) => company.commissions)
  company: Company;
}
