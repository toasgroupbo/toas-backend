import { Controller, Get, Post, Body, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UpdateSettingDto } from './dto';

import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  /*   @Post()
  create(@Body() dto: CreateSettingDto) {
    return this.settingsService.create(dto);
  } */

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  @Get()
  findOne() {
    return this.settingsService.findOne();
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  @Patch()
  update(@Body() dto: UpdateSettingDto) {
    return this.settingsService.update(dto);
  }
}
