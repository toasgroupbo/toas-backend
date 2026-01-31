import { BadRequestException } from '@nestjs/common';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Office } from 'src/modules/offices/entities/office.entity';
import { Travel } from 'src/modules/travels/entities/travel.entity';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column('text', { array: true, default: [] })
  pass_by: string[];

  @Column({ type: 'int', default: 1 })
  travel_hours: number;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Office, (office) => office.origenRoutes, { eager: true })
  officeOrigin: Office;

  @ManyToOne(() => Office, (office) => office.destinationRoutes, {
    eager: true,
  })
  officeDestination: Office;

  @OneToMany(() => Travel, (travel) => travel.route)
  travel: Travel[];

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @BeforeInsert()
  @BeforeUpdate()
  validateOriginAndDestination() {
    if (this.officeOrigin === this.officeDestination) {
      throw new BadRequestException(
        'The origin and destination offices must be different',
      );
    }
  }
}
