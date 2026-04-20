import {
  Get,
  Post,
  Body,
  Param,
  Delete,
  Controller,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth, Resource } from 'src/auth/decorators';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { CreatePlaceDto } from './dto';

import { PlacesService } from './places.service';
import { UpdatePlaceDto } from './dto/update-place.dto';

//!
@Resource(ValidResourses.PLACE)
@ApiBearerAuth('access-token')
//!

@ApiTags('Places')
@Controller('places')
export class PlaceController {
  constructor(private readonly placesService: PlacesService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() dto: CreatePlaceDto) {
    return this.placesService.create(dto);
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Get()
  findAll() {
    return this.placesService.findAll();
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth()
  //!
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.placesService.findOne(id);
  }

  //? ============================================================================================== */
  //?                                         Update                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlaceDto) {
    return this.placesService.update(id, dto);
  }
}
