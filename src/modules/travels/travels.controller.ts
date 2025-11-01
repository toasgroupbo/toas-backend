import {
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Controller,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateTravelDto } from './dto';

import { TravelsService } from './travels.service';

@ApiTags('Travels')
@Controller('travels')
export class TravelsController {
  constructor(private readonly travelsService: TravelsService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @Post()
  create(@Body() createTravelDto: CreateTravelDto) {
    return this.travelsService.create(createTravelDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                           Get_Seats_Available                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @Get('seats-available:id')
  getSeatsAvailable(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.getSeatsAvailable(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 Closed_Travel                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  closed() {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.travelsService.findAll(pagination);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.findOne(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Cancel                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @Put('cancel/:id')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.cancel(id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.travelsService.remove(id);
  }
}
