import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ALL_ENTITIES,
  Playbill,
  Seat,
  Show,
  ShowFunction,
  Ticket,
  TicketLine,
  User,
  Zone,
} from './entities/entities';
import { AuthService } from './auth/auth.service';
import { CatalogService } from './catalog/catalog.service';
import { TicketsService } from './tickets/tickets.service';

describe('Retablo', () => {
  let app: INestApplication;
  let users: Repository<User>;
  let shows: Repository<Show>;
  let functions: Repository<ShowFunction>;
  let zones: Repository<Zone>;
  let seats: Repository<Seat>;
  let playbills: Repository<Playbill>;
  let tickets: Repository<Ticket>;
  let lines: Repository<TicketLine>;
  let auth: AuthService;
  let catalog: CatalogService;
  let ticketSvc: TicketsService;
  let demo: User;
  let other: User;
  let staffUser: User;
  let show: Show;
  let openFn: ShowFunction;
  let closedFn: ShowFunction;
  let patioSeats: Seat[];
  let playbill: Playbill;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '7d' } }),
      ],
      providers: [AuthService, CatalogService, TicketsService],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    users = moduleRef.get(getRepositoryToken(User));
    shows = moduleRef.get(getRepositoryToken(Show));
    functions = moduleRef.get(getRepositoryToken(ShowFunction));
    zones = moduleRef.get(getRepositoryToken(Zone));
    seats = moduleRef.get(getRepositoryToken(Seat));
    playbills = moduleRef.get(getRepositoryToken(Playbill));
    tickets = moduleRef.get(getRepositoryToken(Ticket));
    lines = moduleRef.get(getRepositoryToken(TicketLine));
    auth = moduleRef.get(AuthService);
    catalog = moduleRef.get(CatalogService);
    ticketSvc = moduleRef.get(TicketsService);

    const hash = await bcrypt.hash('demo1234', 4);
    const now = new Date();
    demo = (await users.save({
      username: 'demo',
      email: 'demo@retablo.dev',
      passwordHash: hash,
      role: 'customer',
      displayName: 'Demo',
      createdAt: now,
    } as any)) as User;
    other = (await users.save({
      username: 'otro',
      email: 'otro@retablo.dev',
      passwordHash: hash,
      role: 'customer',
      displayName: 'Otro',
      createdAt: now,
    } as any)) as User;
    staffUser = (await users.save({
      username: 'staff',
      email: 'staff@retablo.dev',
      passwordHash: hash,
      role: 'staff',
      displayName: 'Staff',
      createdAt: now,
    } as any)) as User;

    const patio = (await zones.save({ name: 'Patio', priceCents: 800, sortOrder: 1 } as any)) as Zone;
    await zones.save({ name: 'Banco', priceCents: 1200, sortOrder: 2 } as any);
    await zones.save({ name: 'Palco', priceCents: 1800, sortOrder: 3 } as any);

    patioSeats = [];
    for (let n = 1; n <= 8; n++) {
      patioSeats.push((await seats.save({ zoneId: patio.id, rowLabel: 'P', number: n } as any)) as Seat);
    }

    playbill = (await playbills.save({ name: 'Programa', priceCents: 300, stock: 5 } as any)) as Playbill;

    show = (await shows.save({
      title: 'Don Cristóbal',
      slug: 'don-cristobal',
      synopsis: 'Guiñol',
      durationMin: 50,
      imageKey: 'don-cristobal.svg',
      caption: 'Don Cristóbal entra a palos',
      open: true,
    } as any)) as Show;

    openFn = (await functions.save({
      showId: show.id,
      startsAt: new Date(Date.now() + 86400_000),
      status: 'open',
      createdAt: now,
    } as any)) as ShowFunction;
    closedFn = (await functions.save({
      showId: show.id,
      startsAt: new Date(Date.now() + 2 * 86400_000),
      status: 'closed',
      createdAt: now,
    } as any)) as ShowFunction;
  });

  afterAll(async () => {
    await app.close();
  });

  it('login accepts email identifier', async () => {
    const res = await auth.login({ identifier: 'demo@retablo.dev', password: 'demo1234' });
    expect(res.accessToken).toBeTruthy();
    expect(res.user.email).toBe('demo@retablo.dev');
  });

  it('login accepts username identifier', async () => {
    const res = await auth.login({ identifier: 'demo', password: 'demo1234' });
    expect(res.user.username).toBe('demo');
  });

  it('fromPriceCents is min(zone.priceCents)', async () => {
    const listed = await catalog.listShows();
    expect(listed.items[0].fromPriceCents).toBe(800);
    const z = await catalog.listZones();
    expect(z.fromPriceCents).toBe(800);
  });

  it('freeCount list equals seats map', async () => {
    const listed = await catalog.listFunctions({ showId: show.id });
    const open = listed.items.find((f) => f.id === openFn.id)!;
    const map = await catalog.functionSeats(openFn.id);
    const one = await catalog.getFunction(openFn.id);
    expect(open.freeCount).toBe(map.freeCount);
    expect(one.freeCount).toBe(map.freeCount);
    expect(map.seatTotal).toBe(8);
  });

  it('checkout returns real QR with absolute URL', async () => {
    const t = await ticketSvc.checkout(demo.id, {
      functionId: openFn.id,
      seatIds: [patioSeats[0].id],
    });
    expect(t.status).toBe('confirmed');
    expect(t.qrUrl).toContain(`/entrada/${t.code}`);
    expect(t.qrSvg).toContain(t.qrUrl);
    expect(t.qrSvg).toContain('<svg');
    expect(t.totalCents).toBe(800);
    expect(t.lines.reduce((s: number, l: { amountCents: number }) => s + l.amountCents, 0)).toBe(t.totalCents);
  });

  it('ALREADY_SEATED same user same seat+function', async () => {
    await expect(
      ticketSvc.checkout(demo.id, { functionId: openFn.id, seatIds: [patioSeats[0].id] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'ALREADY_SEATED' } });
  });

  it('SEAT_TAKEN other user', async () => {
    await expect(
      ticketSvc.checkout(other.id, { functionId: openFn.id, seatIds: [patioSeats[0].id] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'SEAT_TAKEN' } });
  });

  it('TOO_MANY_SEATS over four', async () => {
    await expect(
      ticketSvc.checkout(other.id, {
        functionId: openFn.id,
        seatIds: patioSeats.slice(1, 6).map((s) => s.id),
      }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'TOO_MANY_SEATS' } });
  });

  it('FUNCTION_CLOSED', async () => {
    await expect(
      ticketSvc.checkout(other.id, { functionId: closedFn.id, seatIds: [patioSeats[1].id] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'FUNCTION_CLOSED' } });
  });

  it('public by-code returns 200 shape with timeline', async () => {
    const listed = await ticketSvc.listMine(demo.id);
    const code = listed.items[0].code;
    const pub = await ticketSvc.getPublic(code);
    expect(pub.code).toBe(code);
    expect(pub.timeline[0].action).toBe('confirmed');
    expect(pub.qrUrl).toContain(`/entrada/${code}`);
  });

  it('list totalCents equals sum of lines', async () => {
    const listed = await ticketSvc.listMine(demo.id);
    for (const t of listed.items) {
      const sum = t.lines.reduce((s: number, l: { amountCents: number }) => s + l.amountCents, 0);
      expect(t.totalCents).toBe(sum);
    }
    expect(listed.totalCentsSum).toBe(listed.items.reduce((s, t) => s + t.totalCents, 0));
  });

  it('points derived from ended tickets only', async () => {
    const before = await auth.derivedPoints(demo.id);
    expect(before).toBe(0);
    const t = await ticketSvc.checkout(other.id, {
      functionId: openFn.id,
      seatIds: [patioSeats[2].id],
    });
    await ticketSvc.scan(staffUser.id, { codeOrUrl: t.code, action: 'seated', voice: 'staff' });
    await ticketSvc.scan(staffUser.id, { codeOrUrl: t.code, action: 'interval', voice: 'staff' });
    await ticketSvc.scan(staffUser.id, { codeOrUrl: t.code, action: 'ended', voice: 'staff' });
    expect(await auth.derivedPoints(other.id)).toBe(1);
    expect(await auth.derivedPoints(demo.id)).toBe(0);
  });

  it('scan already seated uses staff voice', async () => {
    const t = await ticketSvc.checkout(other.id, {
      functionId: openFn.id,
      seatIds: [patioSeats[3].id],
    });
    await ticketSvc.scan(staffUser.id, { codeOrUrl: t.qrUrl, action: 'seated', voice: 'staff' });
    await expect(
      ticketSvc.scan(staffUser.id, { codeOrUrl: t.code, action: 'seated', voice: 'staff' }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'ALREADY_IN_HALL', message: 'Esta entrada ya está sentada en sala.' },
    });
  });

  it('cancel confirmed releases the seat', async () => {
    const t = await ticketSvc.checkout(other.id, {
      functionId: openFn.id,
      seatIds: [patioSeats[4].id],
    });
    await ticketSvc.cancel(other.id, t.id);
    const again = await ticketSvc.checkout(demo.id, {
      functionId: openFn.id,
      seatIds: [patioSeats[4].id],
    });
    expect(again.status).toBe('confirmed');
  });

  it('playbill stock cannot go negative', async () => {
    await expect(
      ticketSvc.checkout(demo.id, {
        functionId: openFn.id,
        seatIds: [patioSeats[5].id],
        playbillQty: 99,
      }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'NO_PLAYBILL' } });
    const pb = await playbills.findOne({ where: { id: playbill.id } });
    expect(pb!.stock).toBe(5);
  });

  it('ended series has dates and values', async () => {
    const series = await ticketSvc.endedSeries(14);
    expect(series.points).toHaveLength(14);
    expect(series.points[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof series.points[0].value).toBe('number');
    const sum = series.points.reduce((s, p) => s + p.value, 0);
    expect(sum).toBeGreaterThanOrEqual(1);
  });
});
