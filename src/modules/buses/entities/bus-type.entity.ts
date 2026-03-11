import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DeckLayoutDto } from '../dto';

import { Bus } from './bus.entity';

@Entity('bus_types')
export class BusType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  name: string;

  @Column('json')
  decks: DeckLayoutDto[];

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToOne(() => Bus, (bus) => bus.busType)
  buses: Bus;
}
