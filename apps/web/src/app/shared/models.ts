export const API = '/api';
export const TOKEN_KEY = 'retablo.jwt';
export const THEME_KEY = 'retablo.theme';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'customer' | 'staff' | 'admin' | string;
  displayName?: string | null;
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ShowItem {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  durationMin: number;
  imageKey: string | null;
  imageUrl: string | null;
  caption: string | null;
  open: boolean;
  fromPriceCents: number;
  functions?: FunctionItem[];
}

export interface FunctionItem {
  id: string;
  showId: string;
  startsAt: string;
  status: string;
  freeCount: number;
  seatTotal: number;
  band?: string;
  show?: { id: string; title: string; durationMin: number; imageKey?: string | null; caption?: string | null; open?: boolean };
}

export interface SeatItem {
  id: string;
  zoneId: string;
  zoneName?: string;
  rowLabel: string;
  number: number;
  label: string;
  priceCents: number;
  status: 'libre' | 'ocupada' | string;
}

export interface ZoneItem {
  id: string;
  name: string;
  priceCents: number;
  sortOrder: number;
}

export interface PlaybillItem {
  id: string;
  name: string;
  priceCents: number;
  stock: number;
}

export interface TicketLine {
  id: string;
  kind: string;
  seatId: string | null;
  playbillId: string | null;
  amountCents: number;
  qty: number;
  label: string;
}

export interface TimelineStep {
  action: string;
  at: string;
  label: string;
}

export interface TicketItem {
  id: string;
  userId: string;
  functionId: string;
  code: string;
  status: string;
  totalCents: number;
  qrSvg?: string;
  qrUrl: string;
  paidAt: string;
  cancelledAt: string | null;
  lines: TicketLine[];
  timeline: TimelineStep[];
  function?: FunctionItem & { show?: { id: string; title: string; durationMin: number } };
  message?: string;
}

const COPY: Record<string, string> = {
  ALREADY_SEATED: 'Ya tienes esa butaca en esta función.',
  SEAT_TAKEN: 'Esa butaca ya está ocupada.',
  FUNCTION_CLOSED: 'Esa función ya no vende butacas.',
  NO_PLAYBILL: 'El programa de mano se ha agotado.',
  TOO_MANY_SEATS: 'Máximo cuatro butacas por compra.',
  SHOW_CLOSED: 'Esa obra no está en el cartel.',
  ALREADY_IN_HALL: 'Ya te sentamos en sala.',
  ALREADY_INTERVAL: 'Esta entrada ya está en entreacto.',
  ALREADY_ENDED: 'Esa función ya bajó el telón.',
  NOT_CONFIRMED: 'Esta entrada aún no está pagada.',
  ALREADY_SEATED_CANCEL: 'Ya te sentamos; esa entrada no se anula.',
};

export function humanizeApiError(err: unknown): string {
  const e = err as { error?: { code?: string; message?: string }; message?: string };
  const code = e?.error?.code;
  if (code && COPY[code]) return COPY[code];
  const msg = e?.error?.message || e?.message || 'No se pudo completar.';
  return String(msg).replace(/^[A-Z_]+:\s*/, '');
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function madridWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
