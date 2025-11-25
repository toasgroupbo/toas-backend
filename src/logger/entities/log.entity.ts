import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  correlationId: string;

  @Column()
  method: string;

  @Column('boolean')
  success: boolean;

  @Column('jsonb', { nullable: true })
  steps: any[];

  @Column('jsonb', { nullable: true })
  error: any;

  @CreateDateColumn()
  createdAt: Date;
}
