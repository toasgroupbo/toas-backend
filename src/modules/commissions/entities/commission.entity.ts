import {
  Column,
  Entity,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Travel } from 'src/modules/travels/entities/travel.entity';

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn()
  id: number;

  //? ============================================================================================== */

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_company: string;

  @Column({ type: 'int', default: 0 })
  tickets_app_count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_app_total: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_company_total: string;

  @Column({ type: 'timestamptz' })
  departure_time: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToOne(() => Travel)
  @JoinColumn()
  travel: Travel;
}
