import {
  Column,
  Entity,
  OneToOne,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DeckLayoutDto } from '../dto';

import { Bus } from './bus.entity';

@Entity('bus_types')
export class BusType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('json')
  decks: DeckLayoutDto[];

  @Column('boolean', { default: true })
  enabled: boolean;
  /* @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date; */

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToOne(() => Bus, (bus) => bus.busType)
  buses: Bus;
}
