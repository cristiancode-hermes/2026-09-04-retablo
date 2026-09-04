import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('shows')
  shows() {
    return this.catalog.listShows();
  }

  @Get('shows/:id')
  show(@Param('id') id: string) {
    return this.catalog.getShow(id);
  }

  @Get('functions')
  functions(
    @Query('showId') showId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('band') band?: string,
  ) {
    return this.catalog.listFunctions({ showId, from, to, band });
  }

  @Get('functions/:id/seats')
  seats(@Param('id') id: string) {
    return this.catalog.functionSeats(id);
  }

  @Get('functions/:id')
  one(@Param('id') id: string) {
    return this.catalog.getFunction(id);
  }

  @Get('zones')
  zones() {
    return this.catalog.listZones();
  }

  @Get('playbills')
  playbills() {
    return this.catalog.listPlaybills();
  }
}
