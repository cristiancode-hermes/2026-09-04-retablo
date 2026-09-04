import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/current-user';
import { Playbill, Show, ShowFunction, Zone } from '../entities/entities';

export class CreateShowDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsInt()
  durationMin!: number;

  @ApiProperty()
  @IsString()
  synopsis!: string;
}

export class PatchShowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  open?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateFunctionDto {
  @ApiProperty()
  @IsString()
  showId!: string;

  @ApiProperty()
  @IsString()
  startsAt!: string;
}

export class PatchFunctionDto {
  @ApiProperty()
  @IsString()
  status!: 'open' | 'closed';
}

export class PatchZoneDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  priceCents!: number;
}

export class PlaybillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(Show) private readonly shows: Repository<Show>,
    @InjectRepository(ShowFunction) private readonly functions: Repository<ShowFunction>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(Playbill) private readonly playbills: Repository<Playbill>,
  ) {}

  @Post('shows')
  async createShow(@Body() dto: CreateShowDto) {
    const slug = dto.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return this.shows.save({
      title: dto.title,
      slug: `${slug}-${Date.now().toString(36)}`,
      synopsis: dto.synopsis,
      durationMin: dto.durationMin,
      imageKey: 'don-cristobal.svg',
      caption: dto.title,
      open: true,
    } as any);
  }

  @Patch('shows/:id')
  async patchShow(@Param('id') id: string, @Body() dto: PatchShowDto) {
    const show = await this.shows.findOne({ where: { id } });
    if (!show) return { ok: false };
    if (typeof dto.open === 'boolean') show.open = dto.open;
    if (dto.title) show.title = dto.title;
    return this.shows.save(show);
  }

  @Post('functions')
  async createFunction(@Body() dto: CreateFunctionDto) {
    return this.functions.save({
      showId: dto.showId,
      startsAt: new Date(dto.startsAt),
      status: 'open',
      createdAt: new Date(),
    } as any);
  }

  @Patch('functions/:id')
  async patchFunction(@Param('id') id: string, @Body() dto: PatchFunctionDto) {
    const fn = await this.functions.findOne({ where: { id } });
    if (!fn) return { ok: false };
    fn.status = dto.status === 'closed' ? 'closed' : 'open';
    return this.functions.save(fn);
  }

  @Patch('zones/:id')
  async patchZone(@Param('id') id: string, @Body() dto: PatchZoneDto) {
    const zone = await this.zones.findOne({ where: { id } });
    if (!zone) return { ok: false };
    zone.priceCents = dto.priceCents;
    return this.zones.save(zone);
  }

  @Post('playbills')
  createPlaybill(@Body() dto: PlaybillDto) {
    return this.playbills.save({
      name: dto.name || 'Programa de mano',
      priceCents: dto.priceCents ?? 300,
      stock: dto.stock ?? 20,
    } as any);
  }

  @Patch('playbills/:id')
  async patchPlaybill(@Param('id') id: string, @Body() dto: PlaybillDto) {
    const pb = await this.playbills.findOne({ where: { id } });
    if (!pb) return { ok: false };
    if (typeof dto.stock === 'number') pb.stock = dto.stock;
    if (typeof dto.priceCents === 'number') pb.priceCents = dto.priceCents;
    if (dto.name) pb.name = dto.name;
    return this.playbills.save(pb);
  }
}
