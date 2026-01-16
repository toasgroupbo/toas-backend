import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ValidResourses } from 'src/common/enums';

import { Auth, Resource } from '../../auth/decorators';

import { IsVerifyGuard } from 'src/auth/guards';

import { TravelInAppFilterDto } from './pagination/travel-in-app-pagination.dto';

import { TravelsInAppService } from './travels-in-app.service';

//!
@Resource(ValidResourses.TRAVEL_APP)
@ApiBearerAuth('access-token')
//!

@ApiTags('Travels: In App')
@Controller('travels/in-app')
export class TravelsInAppController {
  constructor(private readonly travelsInAppService: TravelsInAppService) {}

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @ApiQuery({
    name: 'departure_time',
    required: false,
    type: Date,
  })
  @ApiQuery({
    name: 'origenId',
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: 'destinationId',
    required: true,
    type: Number,
  })
  @Get('all')
  finAll(@Query() filters: TravelInAppFilterDto) {
    return this.travelsInAppService.findAll(filters);
  }

  //? ============================================================================================== */
  //?                                       FindOne                                                  */
  //? ============================================================================================== */

  //!
  @UseGuards(IsVerifyGuard)
  @Auth()
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.travelsInAppService.findOne(id);
  }
}
