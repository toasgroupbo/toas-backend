import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('Settings')
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commission: number;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */
}
