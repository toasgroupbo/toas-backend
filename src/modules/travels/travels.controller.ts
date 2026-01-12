import {
  Get,
  Post,
  Body,
  Param,
  Delete,
  Controller,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateTravelDto } from './dto';
import { TravelPaginationDto } from './pagination/travel-pagination.dto';

import { TravelStatus } from './enums/travel-status.enum';
import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';

import { TravelsService } from './travels.service';

//!
@Resource(ValidResourses.TRAVEL)
@ApiBearerAuth('access-token')
//!

@ApiTags('Travels')
@Controller('travels')
export class TravelsController {
  constructor(private readonly travelsService: TravelsService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() createTravelDto: CreateTravelDto) {
    return this.travelsService.create(createTravelDto);
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TravelStatus,
  })
  @Get()
  findAll(
    @Query() pagination: TravelPaginationDto,
    @GetCompany() companyId: number,
  ) {
    return this.travelsService.findAll(pagination, companyId); //! GetCompany
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCompany() companyId: number,
  ) {
    return this.travelsService.findOne(id, companyId); //! GetCompany
  }

  //? ============================================================================================== */
  //?                                        Cancel                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CANCEL)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Post('cancel/:id')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @GetCompany() companyId: number,
  ) {
    return this.travelsService.cancel(id, companyId); //! GetCompany
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCompany() companyId: number,
  ) {
    return this.travelsService.remove(id, companyId); //! GetCompany
  }
}
