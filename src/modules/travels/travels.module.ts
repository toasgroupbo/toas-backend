import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TravelsController } from './travels.controller';
import { TravelsService } from './travels.service';
import { Travel } from './entities/travel.entity';

import { TravelSeat } from './entities/travel-seat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Travel, TravelSeat])],
  controllers: [TravelsController],
  providers: [TravelsService],
})
export class TravelsModule {}
