import {
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateTravelDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, Resource } from 'src/auth/decorators';

import { TravelsService } from './travels.service';

//!
@Resource(ValidResourses.TRAVEL)
@ApiBearerAuth('access-token')
//!

@ApiTags('Travels')
@Controller('travels')
export class TravelsController {
  constructor(private readonly travelsService: TravelsService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() createTravelDto: CreateTravelDto) {
    return this.travelsService.create(createTravelDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                           Get_Seats_Available                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get('seats-available:id')
  getSeatsAvailable(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.getSeatsAvailable(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 Closed_Travel                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CLOSE)
  //!
  closed() {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.travelsService.findAll(pagination);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.findOne(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Cancel                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CANCEL)
  //!
  @Post('cancel/:id')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.cancel(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.remove(id);
  }
}
