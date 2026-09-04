import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
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
  Zone,
} from '../entities/entities';
import { TicketsService } from '../tickets/tickets.service';
import { madridWall } from '../time/madrid';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Show) private readonly shows: Repository<Show>,
    @InjectRepository(ShowFunction) private readonly functions: Repository<ShowFunction>,
    @InjectRepository(Zone) private readonly zones: Repository<Zone>,
    @InjectRepository(Seat) private readonly seats: Repository<Seat>,
    @InjectRepository(Playbill) private readonly playbills: Repository<Playbill>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketLine) private readonly lines: Repository<TicketLine>,
    @InjectRepository(SeatLock) private readonly locks: Repository<SeatLock>,
    @InjectRepository(ScanEvent) private readonly scans: Repository<ScanEvent>,
    private readonly ticketsSvc: TicketsService,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    if (await this.users.count()) {
      this.log.log('Seed skipped (users present)');
      return;
    }
    await this.seed();
    this.log.log('Retablo seeded');
  }

  async seed() {
    const hash = await bcrypt.hash('demo1234', 10);
    const demo = (await this.users.save({
      email: 'demo@retablo.dev',
      username: 'demo',
      passwordHash: hash,
      displayName: 'Inés del Patio',
      role: 'customer',
      createdAt: new Date(),
    } as any)) as User;
    await this.users.save({
      email: 'staff@retablo.dev',
      username: 'staff',
      passwordHash: hash,
      displayName: 'Titiritero Lázaro',
      role: 'staff',
      createdAt: new Date(),
    } as any);
    await this.users.save({
      email: 'admin@retablo.dev',
      username: 'admin',
      passwordHash: hash,
      displayName: 'Maese Pedro',
      role: 'admin',
      createdAt: new Date(),
    } as any);

    const patio = (await this.zones.save({ name: 'Patio', priceCents: 800, sortOrder: 1 } as any)) as Zone;
    const banco = (await this.zones.save({ name: 'Banco', priceCents: 1200, sortOrder: 2 } as any)) as Zone;
    const palco = (await this.zones.save({ name: 'Palco', priceCents: 1800, sortOrder: 3 } as any)) as Zone;

    const seatRows: Seat[] = [];
    for (const [zone, row] of [
      [patio, 'P'],
      [banco, 'B'],
      [palco, 'L'],
    ] as Array<[Zone, string]>) {
      for (let n = 1; n <= 8; n++) {
        const s = (await this.seats.save({ zoneId: zone.id, rowLabel: row, number: n } as any)) as Seat;
        seatRows.push(s);
      }
    }

    await this.playbills.save({
      name: 'Programa de mano',
      priceCents: 300,
      stock: 40,
    } as any);

    const showsDef = [
      {
        title: 'Don Cristóbal',
        slug: 'don-cristobal',
        durationMin: 50,
        imageKey: 'don-cristobal.svg',
        caption: 'Don Cristóbal entra a palos por el hueco del retablo',
        synopsis:
          'El médico paleto pierde la compostura, la porra y el hilo. Función corta de guiñol para patio lleno.',
      },
      {
        title: 'La niña del telón',
        slug: 'nina-telon',
        durationMin: 45,
        imageKey: 'nina-telon.svg',
        caption: 'La niña que habla con el terciopelo del telón',
        synopsis: 'Una voz detrás de la boca del retablo cuenta lo que el barrio no se atreve a decir en voz alta.',
      },
      {
        title: 'Los tres marotes',
        slug: 'tres-marotes',
        durationMin: 55,
        imageKey: 'tres-marotes.svg',
        caption: 'Tres marotes se pelean por un mismo palco',
        synopsis: 'Tres cabezas de madera, un solo palco y un vecino que pagó Patio. Risa sucia, cuerda tensa.',
      },
      {
        title: 'Maese Pedro cierra',
        slug: 'maese-pedro',
        durationMin: 40,
        imageKey: 'maese-pedro.svg',
        caption: 'Maese Pedro baja el telón con la última cuerda',
        synopsis: 'Cierre de temporada: el titiritero enseña las juntas del retablo y se sienta entre el público.',
      },
    ];

    const savedShows: Show[] = [];
    for (const def of showsDef) {
      savedShows.push((await this.shows.save({ ...def, open: true } as any)) as Show);
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();

    const past = (await this.functions.save({
      showId: savedShows[0].id,
      startsAt: madridWall(y, m, Math.max(1, d - 3), 18, 0),
      status: 'closed',
      createdAt: new Date(),
    } as any)) as ShowFunction;

    const upcoming: ShowFunction[] = [];
    const slots: Array<[number, number, number]> = [
      [0, 17, 0],
      [0, 19, 30],
      [1, 12, 0],
      [1, 18, 0],
      [2, 17, 0],
      [3, 19, 0],
      [4, 12, 30],
      [5, 18, 0],
    ];
    let i = 0;
    for (const [dayOff, hour, minute] of slots) {
      const show = savedShows[i % savedShows.length];
      upcoming.push(
        (await this.functions.save({
          showId: show.id,
          startsAt: madridWall(y, m, d + dayOff, hour, minute),
          status: 'open',
          createdAt: new Date(),
        } as any)) as ShowFunction,
      );
      i++;
    }

    const patioSeat = seatRows.find((s) => s.rowLabel === 'P' && s.number === 3)!;
    const bancoSeat = seatRows.find((s) => s.rowLabel === 'B' && s.number === 2)!;

    const endedCode = 'ENDED001';
    const endedUrl = `${this.ticketsSvc.webOrigin()}/entrada/${endedCode}`;
    const endedQr = await this.ticketsSvc.buildQr(endedUrl);
    const endedPaid = new Date(past.startsAt.getTime() - 3600_000);
    const ended = (await this.tickets.save({
      userId: demo.id,
      functionId: past.id,
      code: endedCode,
      status: 'ended',
      totalCents: 800,
      qrSvg: endedQr,
      qrUrl: endedUrl,
      paidAt: endedPaid,
      cancelledAt: null,
    } as any)) as Ticket;
    await this.lines.save({
      ticketId: ended.id,
      kind: 'seat',
      seatId: patioSeat.id,
      playbillId: null,
      amountCents: 800,
      qty: 1,
      functionId: past.id,
      label: 'P3 · Patio',
    } as any);
    await this.scans.save({
      ticketId: ended.id,
      action: 'seated',
      at: new Date(past.startsAt.getTime() + 5 * 60_000),
      actorId: demo.id,
    } as any);
    await this.scans.save({
      ticketId: ended.id,
      action: 'ended',
      at: new Date(past.startsAt.getTime() + 90 * 60_000),
      actorId: demo.id,
    } as any);

    const liveFn = upcoming[0];
    const liveCode = 'VIVA0001';
    const liveUrl = `${this.ticketsSvc.webOrigin()}/entrada/${liveCode}`;
    const liveQr = await this.ticketsSvc.buildQr(liveUrl);
    const live = (await this.tickets.save({
      userId: demo.id,
      functionId: liveFn.id,
      code: liveCode,
      status: 'confirmed',
      totalCents: 1200,
      qrSvg: liveQr,
      qrUrl: liveUrl,
      paidAt: new Date(),
      cancelledAt: null,
    } as any)) as Ticket;
    await this.lines.save({
      ticketId: live.id,
      kind: 'seat',
      seatId: bancoSeat.id,
      playbillId: null,
      amountCents: 1200,
      qty: 1,
      functionId: liveFn.id,
      label: 'B2 · Banco',
    } as any);
    await this.locks.save({ functionId: liveFn.id, seatId: bancoSeat.id, ticketId: live.id } as any);
  }
}
