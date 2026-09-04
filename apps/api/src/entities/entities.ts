import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ default: 'Vecino' })
  displayName: string;

  @Column({ default: 'customer' })
  role: 'customer' | 'staff' | 'admin';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('shows')
export class Show {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text' })
  synopsis: string;

  @Column({ type: 'int' })
  durationMin: number;

  @Column({ type: 'varchar', nullable: true })
  imageKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  caption: string | null;

  @Column({ default: true })
  open: boolean;

  @OneToMany(() => ShowFunction, (fn) => fn.show)
  functions?: ShowFunction[];
}

@Entity('functions')
@Index(['showId', 'startsAt'])
export class ShowFunction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  showId: string;

  @ManyToOne(() => Show, (s) => s.functions, { onDelete: 'RESTRICT' })
  show: Show;

  @Column({ type: 'datetime' })
  startsAt: Date;

  @Column({ default: 'open' })
  status: 'open' | 'closed';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'int' })
  sortOrder: number;

  @OneToMany(() => Seat, (s) => s.zone)
  seats?: Seat[];
}

@Entity('seats')
@Unique(['zoneId', 'rowLabel', 'number'])
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  zoneId: string;

  @ManyToOne(() => Zone, (z) => z.seats, { onDelete: 'RESTRICT' })
  zone: Zone;

  @Column()
  rowLabel: string;

  @Column({ type: 'int' })
  number: number;
}

@Entity('playbills')
export class Playbill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'int' })
  stock: number;
}

@Entity('tickets')
@Index(['userId'])
@Index(['functionId', 'status'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  user: User;

  @Column()
  functionId: string;

  @ManyToOne(() => ShowFunction, { onDelete: 'RESTRICT' })
  function: ShowFunction;

  @Column({ unique: true })
  code: string;

  @Column()
  status: 'confirmed' | 'seated' | 'interval' | 'ended' | 'cancelled';

  @Column({ type: 'int' })
  totalCents: number;

  @Column({ type: 'text' })
  qrSvg: string;

  @Column()
  qrUrl: string;

  @Column({ type: 'datetime' })
  paidAt: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @OneToMany(() => TicketLine, (l) => l.ticket)
  lines?: TicketLine[];

  @OneToMany(() => ScanEvent, (s) => s.ticket)
  scans?: ScanEvent[];
}

@Entity('ticket_lines')
export class TicketLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketId: string;

  @ManyToOne(() => Ticket, (t) => t.lines, { onDelete: 'CASCADE' })
  ticket: Ticket;

  @Column()
  kind: 'seat' | 'playbill';

  @Column({ type: 'varchar', nullable: true })
  seatId: string | null;

  @ManyToOne(() => Seat, { nullable: true, onDelete: 'RESTRICT' })
  seat: Seat | null;

  @Column({ type: 'varchar', nullable: true })
  playbillId: string | null;

  @ManyToOne(() => Playbill, { nullable: true, onDelete: 'RESTRICT' })
  playbill: Playbill | null;

  @Column({ type: 'int' })
  amountCents: number;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @Column()
  functionId: string;

  @Column({ default: '' })
  label: string;
}

@Entity('ticket_seat_locks')
@Unique(['functionId', 'seatId'])
export class SeatLock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  functionId: string;

  @Column()
  seatId: string;

  @Column()
  ticketId: string;
}

@Entity('scan_events')
export class ScanEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketId: string;

  @ManyToOne(() => Ticket, (t) => t.scans, { onDelete: 'CASCADE' })
  ticket: Ticket;

  @Column()
  action: 'seated' | 'interval' | 'ended';

  @Column({ type: 'datetime' })
  at: Date;

  @Column()
  actorId: string;
}

export const ALL_ENTITIES = [
  User,
  Show,
  ShowFunction,
  Zone,
  Seat,
  Playbill,
  Ticket,
  TicketLine,
  SeatLock,
  ScanEvent,
];

export const LIVE_TICKET_STATUSES = ['confirmed', 'seated', 'interval'] as const;
