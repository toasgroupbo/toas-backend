import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OfficesController } from './offices.controller';
import { OfficesService } from './offices.service';
import { Office } from './entities/office.entity';

import { PlaceController } from './places.controller';
import { PlacesService } from './places.service';
import { Place } from './entities/place.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Office, Place])],
  controllers: [OfficesController, PlaceController],
  providers: [OfficesService, PlacesService],
  exports: [TypeOrmModule],
})
export class OfficesModule {}
