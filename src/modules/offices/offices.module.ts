import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OfficesController } from './offices.controller';
import { OfficesService } from './offices.service';
import { Office } from './entities/office.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Office])],
  controllers: [OfficesController],
  providers: [OfficesService],
  exports: [TypeOrmModule],
})
export class OfficesModule {}
