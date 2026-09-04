import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Playbill, Seat, SeatLock, Show, ShowFunction, Zone } from '../entities/entities';
import { slotBand } from '../time/madrid';

const LIVE = ['confirmed', 'seated', 'interval'];

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Show) private readonly shows: Repository<Show>,
    @InjectRepository(ShowFunction) private readonly functions: Repository<ShowFunction>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
    @InjectRepository(SeatLock) private readonly locks: Repository<SeatLock>,
    @InjectRepository(Playbill) private readonly playbills: Repository<Playbill>,
  ) {}

  async fromPriceCents(): Promise<number> {
    const rows = await this.zones.find();
    if (!rows.length) return 0;
    return Math.min(...rows.map((z) => z.priceCents));
  }

  async listShows() {
    const items = await this.shows.find({ order: { title: 'ASC' } });
    const fromPriceCents = await this.fromPriceCents();
    return {
      items: items.map((s) => this.serializeShow(s, fromPriceCents)),
    };
  }

  async getShow(id: string) {
    const show = await this.shows.findOne({ where: { id } });
    if (!show) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Esa obra no está en cartel.' });
    const fromPriceCents = await this.fromPriceCents();
    const fns = await this.functions.find({ where: { showId: id }, order: { startsAt: 'ASC' } });
    const withFree = await this.attachFree(fns);
    return { ...this.serializeShow(show, fromPriceCents), functions: withFree };
  }

  async listFunctions(q: { showId?: string; from?: string; to?: string; band?: string }) {
    let fns = await this.functions.find({
      where: q.showId ? { showId: q.showId } : {},
      relations: { show: true },
      order: { startsAt: 'ASC' },
    });
    if (q.from) fns = fns.filter((f) => f.startsAt.toISOString() >= q.from);
    if (q.to) fns = fns.filter((f) => f.startsAt.toISOString() <= q.to);
    if (q.band) fns = fns.filter((f) => slotBand(f.startsAt) === q.band);
    const items = await this.attachFree(fns);
    return { items };
  }

  async getFunction(id: string) {
    const fn = await this.functions.findOne({ where: { id }, relations: { show: true } });
    if (!fn) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Esa función no está en cartel.' });
    const [item] = await this.attachFree([fn]);
    return item;
  }

  async functionSeats(id: string) {
    const fn = await this.functions.findOne({ where: { id }, relations: { show: true } });
    if (!fn) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Esa función no está en cartel.' });
    const zones = await this.zones.find({ order: { sortOrder: 'ASC' } });
    const seats = await this.seats.find({ relations: { zone: true }, order: { rowLabel: 'ASC', number: 'ASC' } });
    const taken = await this.locks.find({ where: { functionId: id } });
    const takenSet = new Set(taken.map((t) => t.seatId));
    const freeCount = seats.length - takenSet.size;
    return {
      function: (await this.attachFree([fn]))[0],
      zones: zones.map((z) => ({ id: z.id, name: z.name, priceCents: z.priceCents, sortOrder: z.sortOrder })),
      seats: seats.map((s) => ({
        id: s.id,
        zoneId: s.zoneId,
        zoneName: s.zone?.name,
        rowLabel: s.rowLabel,
        number: s.number,
        label: `${s.rowLabel}${s.number}`,
        priceCents: s.zone?.priceCents ?? 0,
        status: takenSet.has(s.id) ? 'ocupada' : 'libre',
      })),
      freeCount,
      seatTotal: seats.length,
    };
  }

  async listZones() {
    const items = await this.zones.find({ order: { sortOrder: 'ASC' } });
    return { items, fromPriceCents: items.length ? Math.min(...items.map((z) => z.priceCents)) : 0 };
  }

  async listPlaybills() {
    const items = await this.playbills.find({ order: { name: 'ASC' } });
    return { items };
  }

  private serializeShow(s: Show, fromPriceCents: number) {
    return {
      id: s.id,
      title: s.title,
      slug: s.slug,
      synopsis: s.synopsis,
      durationMin: s.durationMin,
      imageKey: s.imageKey,
      imageUrl: s.imageKey ? `/assets/${s.imageKey}` : null,
      caption: s.caption,
      open: s.open,
      fromPriceCents,
    };
  }

  async attachFree(fns: ShowFunction[]) {
    const seatTotal = await this.seats.count();
    const ids = fns.map((f) => f.id);
    const locks = ids.length ? await this.locks.find({ where: { functionId: In(ids) } }) : [];
    const byFn = new Map<string, number>();
    for (const l of locks) byFn.set(l.functionId, (byFn.get(l.functionId) || 0) + 1);
    return fns.map((f) => {
      const taken = byFn.get(f.id) || 0;
      const show = (f as ShowFunction & { show?: Show }).show;
      return {
        id: f.id,
        showId: f.showId,
        startsAt: f.startsAt.toISOString(),
        status: f.status,
        freeCount: Math.max(0, seatTotal - taken),
        seatTotal,
        band: slotBand(f.startsAt),
        show: show
          ? {
              id: show.id,
              title: show.title,
              slug: show.slug,
              durationMin: show.durationMin,
              imageKey: show.imageKey,
              caption: show.caption,
              open: show.open,
            }
          : undefined,
      };
    });
  }
}
