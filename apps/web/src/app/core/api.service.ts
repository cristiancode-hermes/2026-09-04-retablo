import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API, FunctionItem, PlaybillItem, SeatItem, ShowItem, TicketItem, ZoneItem } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  shows(): Observable<{ items: ShowItem[] }> {
    return this.http.get<{ items: ShowItem[] }>(`${API}/shows`);
  }
  show(id: string): Observable<ShowItem> {
    return this.http.get<ShowItem>(`${API}/shows/${id}`);
  }
  functions(params?: { showId?: string; band?: string }): Observable<{ items: FunctionItem[] }> {
    const q = new URLSearchParams();
    if (params?.showId) q.set('showId', params.showId);
    if (params?.band) q.set('band', params.band);
    const s = q.toString();
    return this.http.get<{ items: FunctionItem[] }>(`${API}/functions${s ? '?' + s : ''}`);
  }
  functionOne(id: string): Observable<FunctionItem> {
    return this.http.get<FunctionItem>(`${API}/functions/${id}`);
  }
  seats(id: string): Observable<{ seats: SeatItem[]; zones: ZoneItem[]; freeCount: number; seatTotal: number; function: FunctionItem }> {
    return this.http.get<{ seats: SeatItem[]; zones: ZoneItem[]; freeCount: number; seatTotal: number; function: FunctionItem }>(
      `${API}/functions/${id}/seats`,
    );
  }
  playbills(): Observable<{ items: PlaybillItem[] }> {
    return this.http.get<{ items: PlaybillItem[] }>(`${API}/playbills`);
  }
  zones(): Observable<{ items: ZoneItem[]; fromPriceCents: number }> {
    return this.http.get<{ items: ZoneItem[]; fromPriceCents: number }>(`${API}/zones`);
  }
  checkout(body: { functionId: string; seatIds: string[]; playbillQty?: number }): Observable<TicketItem> {
    return this.http.post<TicketItem>(`${API}/tickets/checkout`, body);
  }
  myTickets(): Observable<{ items: TicketItem[]; totalCentsSum: number }> {
    return this.http.get<{ items: TicketItem[]; totalCentsSum: number }>(`${API}/tickets`);
  }
  ticket(id: string): Observable<TicketItem> {
    return this.http.get<TicketItem>(`${API}/tickets/${id}`);
  }
  byCode(code: string): Observable<TicketItem> {
    return this.http.get<TicketItem>(`${API}/tickets/by-code/${code}`);
  }
  cancel(id: string): Observable<TicketItem> {
    return this.http.post<TicketItem>(`${API}/tickets/${id}/cancel`, {});
  }
  scan(body: { codeOrUrl: string; action: string; voice?: string }): Observable<TicketItem> {
    return this.http.post<TicketItem>(`${API}/staff/scan`, body);
  }
  today(): Observable<{ seated: number; interval: number; ended: number }> {
    return this.http.get<{ seated: number; interval: number; ended: number }>(`${API}/staff/today`);
  }
  endedStats(): Observable<{ points: { date: string; value: number }[] }> {
    return this.http.get<{ points: { date: string; value: number }[] }>(`${API}/stats/ended?days=14`);
  }
  adminCreateFunction(body: { showId: string; startsAt: string }): Observable<FunctionItem> {
    return this.http.post<FunctionItem>(`${API}/admin/functions`, body);
  }
  adminCloseFunction(id: string): Observable<FunctionItem> {
    return this.http.patch<FunctionItem>(`${API}/admin/functions/${id}`, { status: 'closed' });
  }
}
