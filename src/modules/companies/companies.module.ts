import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

import { CompanyController } from './companies.controller';

import { CompanyService } from './companies.service';

import { Company } from './entities/company.entity';
import { CompanyOwner } from './entities/company-owners.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyOwner]),
    UsersModule,
    RolesModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [TypeOrmModule],
})
export class CompaniesModule {}
