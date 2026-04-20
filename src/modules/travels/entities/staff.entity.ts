import {
  Column,
  Entity,
  ManyToMany,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from '../../companies/entities/company.entity';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  name: string;

  @Column('text', { unique: true })
  ci: string;

  @Column('text', { nullable: true })
  phone?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToMany(() => Company, (company) => company.staff)
  companies: Company[];
}
