import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { Route } from './entities/route.entity';

import { RoutesInAppController } from './routes-in-app.controller';
import { RoutesInAppService } from './routes-in-app.service';

@Module({
  imports: [TypeOrmModule.forFeature([Route])],
  controllers: [RoutesController, RoutesInAppController],
  providers: [RoutesService, RoutesInAppService],
  exports: [RoutesService, RoutesInAppService, TypeOrmModule],
})
export class RoutesModule {}
