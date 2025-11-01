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
import { Office } from '../../../modules/offices/entities/office.entity';
import { Travel } from '../../../modules/travels/entities/travel.entity';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Office, (office) => office.origenRoutes, { eager: true })
  officeOrigin: Office;

  @ManyToOne(() => Office, (office) => office.destinationRoutes)
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
