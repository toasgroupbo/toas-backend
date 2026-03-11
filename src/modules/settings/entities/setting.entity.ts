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

  @Column({ type: 'text', default: null })
  terminos_y_condiciones: string;

  @Column({ type: 'text', default: null })
  politicas_de_privacidad: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;
}
