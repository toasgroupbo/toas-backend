import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Office } from './office.entity';

@Entity('places')
export class Place {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  name: string;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @OneToMany(() => Office, (office) => office.place)
  offices: Office[];
}
