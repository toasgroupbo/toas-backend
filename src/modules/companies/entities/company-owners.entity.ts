import {
  Unique,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from './company.entity';
import { Owner } from 'src/modules/owners/entities/owner.entity';

@Entity('company_owners')
@Unique(['owner', 'company'])
export class CompanyOwner {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Owner, (owner) => owner.companyOwner)
  owner: Owner;

  @ManyToOne(() => Company, (company) => company.companyOwner)
  company: Company;

  @Column('boolean', { default: true })
  enabled: boolean;
}
