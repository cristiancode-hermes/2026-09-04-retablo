import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, In, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import {
  Playbill,
  ScanEvent,
  Seat,
  SeatLock,
  Show,
  ShowFunction,
  Ticket,
  TicketLine,
  User,
} from '../entities/entities';
import { formatMadrid } from '../time/madrid';

const COPY = {
  ALREADY_SEATED: 'Ya tienes esa butaca en esta función.',
  SEAT_TAKEN: 'Esa butaca ya está ocupada.',
  FUNCTION_CLOSED: 'Esa función ya no vende butacas.',
  NO_PLAYBILL: 'El programa de mano se ha agotado.',
  TOO_MANY_SEATS: 'Máximo cuatro butacas por compra.',
  SHOW_CLOSED: 'Esa obra no está en el cartel.',
  NO_SEATS: 'Elige al menos una butaca.',
  NOT_FOUND: 'No encontramos esa entrada.',
  ALREADY_IN_HALL: { self: 'Ya te sentamos en sala.', staff: 'Esta entrada ya está sentada en sala.' },
  ALREADY_INTERVAL: { self: 'Esa función ya está en entreacto.', staff: 'Esta entrada ya está en entreacto.' },
  ALREADY_ENDED: { self: 'Esa función ya bajó el telón.', staff: 'Esta entrada ya cerró con el telón.' },
  NOT_CONFIRMED: { self: 'Esta entrada aún no está pagada.', staff: 'Esta entrada aún no está pagada.' },
  ALREADY_SEATED_CANCEL: 'Ya te sentamos; esa entrada no se anula.',
};

function conflict(code: keyof typeof COPY, message?: string) {
  const raw = COPY[code];
  const msg = message || (typeof raw === 'string' ? raw : raw.staff);
  throw new HttpException({ code, message: msg }, 409);
}

let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

const LIVE = ['confirmed', 'seated', 'interval'];

@Injectable()
export class TicketsService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly ds: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketLine) private readonly lines: Repository<TicketLine>,
    @InjectRepository(ShowFunction) private readonly functions: Repository<ShowFunction>,
    @InjectRepository(Show) private readonly shows: Repository<Show>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
    @InjectRepository(SeatLock) private readonly locks: Repository<SeatLock>,
    @InjectRepository(Playbill) private readonly playbills: Repository<Playbill>,
    @InjectRepository(ScanEvent) private readonly scans: Repository<ScanEvent>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.expireStale().catch(() => undefined);
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  webOrigin(): string {
    return (this.config.get<string>('WEB_ORIGIN') || 'http://localhost:3084').replace(/\/$/, '');
  }

  async buildQr(qrUrl: string): Promise<string> {
    const svg = await QRCode.toString(qrUrl, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 240 });
    return svg
      .replace('<svg', `<svg data-session-url="${qrUrl}"`)
      .replace('</svg>', `<desc>${qrUrl}</desc></svg>`);
  }

  async expireStale() {
    const fns = await this.functions.find({ where: { status: 'open' }, relations: { show: true } });
    const now = Date.now();
    for (const fn of fns) {
      const duration = fn.show?.durationMin || 50;
      const ends = fn.startsAt.getTime() + (duration + 40) * 60_000;
      if (now < ends) continue;
      fn.status = 'closed';
      await this.functions.save(fn);
      const live = await this.tickets.find({
        where: LIVE.map((status) => ({ functionId: fn.id, status })) as any,
      });
      for (const t of live) {
        t.status = 'ended';
        await this.tickets.save(t);
        await this.scans.save({
          ticketId: t.id,
          action: 'ended',
          at: new Date(),
          actorId: t.userId,
        } as any);
      }
    }
  }

  async checkout(userId: string, dto: { functionId: string; seatIds: string[]; playbillQty?: number }) {
    const seatIds = [...new Set((dto.seatIds || []).filter(Boolean))];
    if (!seatIds.length) throw new BadRequestException({ code: 'NO_SEATS', message: COPY.NO_SEATS });
    if (seatIds.length > 4) conflict('TOO_MANY_SEATS');
    return withLock(() => this.checkoutLocked(userId, dto.functionId, seatIds, dto.playbillQty || 0));
  }

  private async checkoutLocked(userId: string, functionId: string, seatIds: string[], playbillQty: number) {
    const fn = await this.functions.findOne({ where: { id: functionId }, relations: { show: true } });
    if (!fn) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Esa función no está en cartel.' });
    if (fn.status !== 'open') conflict('FUNCTION_CLOSED');
    if (fn.show && !fn.show.open) conflict('SHOW_CLOSED');

    const mine = await this.tickets.find({
      where: LIVE.map((status) => ({ userId, functionId, status })) as any,
      relations: { lines: true },
    });
    const mineSeats = new Set(
      mine.flatMap((t) => (t.lines || []).filter((l) => l.kind === 'seat' && l.seatId).map((l) => l.seatId as string)),
    );
    if (seatIds.some((id) => mineSeats.has(id))) conflict('ALREADY_SEATED');

    return this.ds.transaction(async (manager) => {
      const taken = await manager.getRepository(SeatLock).find({
        where: { functionId, seatId: In(seatIds) },
      });
      if (taken.length) conflict('SEAT_TAKEN');

      const seatEntities = await manager.getRepository(Seat).find({
        where: { id: In(seatIds) },
        relations: { zone: true },
      });
      if (seatEntities.length !== seatIds.length) {
        throw new BadRequestException({ code: 'NO_SEATS', message: 'Alguna butaca no pertenece a esta sala.' });
      }

      let playbill: Playbill | null = null;
      if (playbillQty > 0) {
        playbill = await manager.getRepository(Playbill).findOne({ where: {} });
        if (!playbill || playbill.stock < playbillQty) conflict('NO_PLAYBILL');
        playbill.stock -= playbillQty;
        await manager.getRepository(Playbill).save(playbill);
      }

      let total = 0;
      const lineDefs: Array<{
        kind: 'seat' | 'playbill';
        seatId: string | null;
        playbillId: string | null;
        amountCents: number;
        qty: number;
        functionId: string;
        label: string;
      }> = [];
      const seatMap = new Map(seatEntities.map((s) => [s.id, s]));
      for (const sid of seatIds) {
        const seat = seatMap.get(sid);
        if (!seat?.zone) throw new BadRequestException('Butaca desconocida');
        const price = seat.zone.priceCents;
        total += price;
        lineDefs.push({
          kind: 'seat',
          seatId: sid,
          playbillId: null,
          amountCents: price,
          qty: 1,
          functionId,
          label: `${seat.rowLabel}${seat.number} · ${seat.zone.name}`,
        });
      }
      if (playbill && playbillQty > 0) {
        const extra = playbill.priceCents * playbillQty;
        total += extra;
        lineDefs.push({
          kind: 'playbill',
          seatId: null,
          playbillId: playbill.id,
          amountCents: extra,
          qty: playbillQty,
          functionId,
          label: playbill.name,
        });
      }

      let code = randomCode();
      for (let i = 0; i < 8; i++) {
        const clash = await manager.getRepository(Ticket).findOne({ where: { code } });
        if (!clash) break;
        code = randomCode();
      }
      const qrUrl = `${this.webOrigin()}/entrada/${code}`;
      const qrSvg = await this.buildQr(qrUrl);
      const paidAt = new Date();

      const ticket = (await manager.getRepository(Ticket).save({
        userId,
        functionId,
        code,
        status: 'confirmed',
        totalCents: total,
        qrSvg,
        qrUrl,
        paidAt,
        cancelledAt: null,
      } as any)) as Ticket;

      for (const def of lineDefs) {
        await manager.getRepository(TicketLine).save({ ticketId: ticket.id, ...def } as any);
      }
      for (const sid of seatIds) {
        await manager.getRepository(SeatLock).save({ functionId, seatId: sid, ticketId: ticket.id } as any);
      }

      return this.serialize(await this.reload(manager, ticket.id), true);
    });
  }

  private async reload(manager: { getRepository: DataSource['getRepository'] } | DataSource, id: string) {
    const repo = 'getRepository' in manager ? manager.getRepository(Ticket) : this.tickets;
    return repo.findOne({
      where: { id },
      relations: { lines: { seat: { zone: true } }, function: { show: true }, scans: true },
    });
  }

  async listMine(userId: string) {
    const items = await this.tickets.find({
      where: { userId },
      relations: { lines: true, function: { show: true } },
      order: { paidAt: 'DESC' },
    });
    const serialized = items.map((t) => this.serialize(t, false));
    const totalCentsSum = serialized.reduce((s, t) => s + t.totalCents, 0);
    return { items: serialized, totalCentsSum };
  }

  async getMine(userId: string, idOrCode: string) {
    const ticket = await this.findByIdOrCode(idOrCode);
    if (!ticket) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });
    if (ticket.userId !== userId) throw new ForbiddenException();
    return this.serialize(ticket, true);
  }

  async getPublic(code: string) {
    const ticket = await this.findByIdOrCode(code);
    if (!ticket) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });
    return this.serialize(ticket, true);
  }

  async cancel(userId: string, id: string) {
    const ticket = await this.tickets.findOne({ where: { id }, relations: { lines: true } });
    if (!ticket || ticket.userId !== userId) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });
    if (ticket.status !== 'confirmed') {
      throw new HttpException({ code: 'ALREADY_SEATED_CANCEL', message: COPY.ALREADY_SEATED_CANCEL }, 409);
    }
    return withLock(async () => {
      ticket.status = 'cancelled';
      ticket.cancelledAt = new Date();
      await this.tickets.save(ticket);
      await this.locks.delete({ ticketId: ticket.id });
      const pbLine = (ticket.lines || []).find((l) => l.kind === 'playbill' && l.playbillId);
      if (pbLine?.playbillId) {
        const pb = await this.playbills.findOne({ where: { id: pbLine.playbillId } });
        if (pb) {
          pb.stock += pbLine.qty;
          await this.playbills.save(pb);
        }
      }
      return this.serialize(await this.reload(this.ds, ticket.id), true);
    });
  }

  async scan(actorId: string, dto: { codeOrUrl: string; action: 'seated' | 'interval' | 'ended'; voice?: 'self' | 'staff' }) {
    const voice = dto.voice === 'self' ? 'self' : 'staff';
    const code = this.extractCode(dto.codeOrUrl);
    const ticket = await this.findByIdOrCode(code);
    if (!ticket) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });

    const say = (key: 'ALREADY_IN_HALL' | 'ALREADY_INTERVAL' | 'ALREADY_ENDED' | 'NOT_CONFIRMED') => {
      throw new HttpException({ code: key, message: COPY[key][voice] }, 409);
    };

    if (dto.action === 'seated') {
      if (ticket.status === 'seated' || ticket.status === 'interval' || ticket.status === 'ended') say('ALREADY_IN_HALL');
      if (ticket.status !== 'confirmed') say('NOT_CONFIRMED');
      ticket.status = 'seated';
    } else if (dto.action === 'interval') {
      if (ticket.status === 'interval') say('ALREADY_INTERVAL');
      if (ticket.status === 'ended') say('ALREADY_ENDED');
      if (ticket.status !== 'seated') say('NOT_CONFIRMED');
      ticket.status = 'interval';
    } else {
      if (ticket.status === 'ended') say('ALREADY_ENDED');
      if (ticket.status === 'cancelled' || ticket.status === 'confirmed') say('NOT_CONFIRMED');
      ticket.status = 'ended';
    }
    await this.tickets.save(ticket);
    await this.scans.save({ ticketId: ticket.id, action: dto.action, at: new Date(), actorId } as any);
    const fresh = await this.reload(this.ds, ticket.id);
    const message =
      dto.action === 'seated'
        ? voice === 'staff'
          ? 'Entrada sentada en sala.'
          : 'Te sentamos en sala.'
        : dto.action === 'interval'
          ? 'Entreacto marcado.'
          : 'Telón bajado.';
    return { ...this.serialize(fresh, true), message };
  }

  async today() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const scans = await this.scans.find();
    const seated = scans.filter((s) => s.action === 'seated' && s.at >= start).length;
    const interval = scans.filter((s) => s.action === 'interval' && s.at >= start).length;
    const ended = scans.filter((s) => s.action === 'ended' && s.at >= start).length;
    return { seated, interval, ended };
  }

  async endedSeries(days = 14) {
    const n = Math.min(31, Math.max(1, days));
    const points: { date: string; value: number }[] = [];
    const tickets = await this.tickets.find({ where: { status: 'ended' } });
    const endedScans = await this.scans.find({ where: { action: 'ended' } });
    const byDay = new Map<string, number>();
    for (const t of tickets) {
      const scan = endedScans.find((s) => s.ticketId === t.id);
      const when = scan?.at || t.paidAt;
      const key = formatMadrid(when).slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatMadrid(d).slice(0, 10);
      points.push({ date: key, value: byDay.get(key) || 0 });
    }
    return { points };
  }

  extractCode(codeOrUrl: string): string {
    const raw = (codeOrUrl || '').trim();
    const m = raw.match(/entrada\/([A-Z0-9]{8})/i);
    if (m) return m[1].toUpperCase();
    return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  private async findByIdOrCode(idOrCode: string) {
    const code = this.extractCode(idOrCode);
    let ticket = await this.tickets.findOne({
      where: { code },
      relations: { lines: { seat: { zone: true } }, function: { show: true }, scans: true },
    });
    if (!ticket) {
      ticket = await this.tickets.findOne({
        where: { id: idOrCode },
        relations: { lines: { seat: { zone: true } }, function: { show: true }, scans: true },
      });
    }
    return ticket;
  }

  serialize(ticket: Ticket | null, withQr: boolean) {
    if (!ticket) throw new NotFoundException({ code: 'NOT_FOUND', message: COPY.NOT_FOUND });
    const lines = (ticket.lines || []).map((l) => ({
      id: l.id,
      kind: l.kind,
      seatId: l.seatId,
      playbillId: l.playbillId,
      amountCents: l.amountCents,
      qty: l.qty,
      label: l.label,
      seat:
        l.seat
          ? {
              id: l.seat.id,
              rowLabel: l.seat.rowLabel,
              number: l.seat.number,
              zoneName: l.seat.zone?.name,
            }
          : null,
    }));
    const sum = lines.reduce((s, l) => s + l.amountCents, 0);
    const scans = [...(ticket.scans || [])].sort((a, b) => a.at.getTime() - b.at.getTime());
    const timeline = [
      { action: 'confirmed', at: ticket.paidAt.toISOString(), label: 'Pagada' },
      ...scans.map((s) => ({
        action: s.action,
        at: s.at.toISOString(),
        label: s.action === 'seated' ? 'Sentada' : s.action === 'interval' ? 'Entreacto' : 'Telón',
      })),
    ];
    if (ticket.status === 'cancelled') {
      timeline.push({
        action: 'cancelled',
        at: (ticket.cancelledAt || ticket.paidAt).toISOString(),
        label: 'Anulada',
      });
    }
    return {
      id: ticket.id,
      userId: ticket.userId,
      functionId: ticket.functionId,
      code: ticket.code,
      status: ticket.status,
      totalCents: sum,
      qrSvg: withQr ? ticket.qrSvg : undefined,
      qrUrl: ticket.qrUrl,
      paidAt: ticket.paidAt.toISOString(),
      cancelledAt: ticket.cancelledAt ? ticket.cancelledAt.toISOString() : null,
      lines,
      timeline,
      function: ticket.function
        ? {
            id: ticket.function.id,
            startsAt: ticket.function.startsAt.toISOString(),
            status: ticket.function.status,
            show: ticket.function.show
              ? {
                  id: ticket.function.show.id,
                  title: ticket.function.show.title,
                  durationMin: ticket.function.show.durationMin,
                  imageKey: ticket.function.show.imageKey,
                  caption: ticket.function.show.caption,
                }
              : undefined,
          }
        : undefined,
    };
  }
}
