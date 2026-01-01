import {
  Get,
  Post,
  Body,
  Param,
  Delete,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateTravelDto } from './dto';

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
  @Get()
  findAll(@GetCompany() companyId: number) {
    return this.travelsService.findAll(companyId); //! GetCompany
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
