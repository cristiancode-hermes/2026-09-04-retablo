import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FunctionItem, SeatItem, money, madridWhen } from '../shared/models';

@Component({
  selector: 'app-function-detail',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>Función no encontrada</h2>
          <p>{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/obras">Cartelera</a>
        </section>
      } @else if (fn(); as f) {
        <p class="kicker">{{ f.show?.title }}</p>
        <h1>{{ madridWhen(f.startsAt) }}</h1>
        <p class="muted">{{ f.freeCount }} libres de {{ f.seatTotal }}</p>
        <div class="seat-map">
          @for (row of rows(); track row.label) {
            <div>
              <p class="muted">Fila {{ row.label }}</p>
              <div class="seat-row">
                @for (s of row.seats; track s.id) {
                  <button
                    type="button"
                    class="seat-chip"
                    [class.taken]="s.status !== 'libre'"
                    [class.mine]="selected().has(s.id)"
                    [disabled]="s.status !== 'libre'"
                    (click)="toggle(s)"
                  >
                    <span>{{ s.label }}</span>
                    <span>{{ s.status === 'libre' ? 'Libre' : 'Ocupada' }}</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
        <p>Selección: {{ selected().size }} · {{ money(liveTotal()) }}</p>
        <p>
          <button class="btn btn-primary" type="button" [disabled]="!selected().size" (click)="goCheckout()">Ir a pagar</button>
        </p>
      }
    </main>
  `,
})
export class FunctionDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly fn = signal<FunctionItem | null>(null);
  readonly seats = signal<SeatItem[]>([]);
  readonly selected = signal(new Set<string>());
  readonly loading = signal(true);
  readonly error = signal('');
  readonly money = money;
  readonly madridWhen = madridWhen;

  readonly rows = computed(() => {
    const map = new Map<string, SeatItem[]>();
    for (const s of this.seats()) {
      const arr = map.get(s.rowLabel) || [];
      arr.push(s);
      map.set(s.rowLabel, arr);
    }
    return [...map.entries()].map(([label, seats]) => ({ label, seats }));
  });

  readonly liveTotal = computed(() => {
    const ids = this.selected();
    return this.seats().filter((s) => ids.has(s.id)).reduce((n, s) => n + s.priceCents, 0);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.seats(id).subscribe({
      next: (r) => {
        this.fn.set(r.function);
        this.seats.set(r.seats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Esa función no está en cartel.');
        this.loading.set(false);
      },
    });
  }

  toggle(s: SeatItem): void {
    if (s.status !== 'libre') return;
    const next = new Set(this.selected());
    if (next.has(s.id)) next.delete(s.id);
    else {
      if (next.size >= 4) return;
      next.add(s.id);
    }
    this.selected.set(next);
  }

  goCheckout(): void {
    const id = this.fn()?.id;
    if (!id) return;
    const seats = [...this.selected()].join(',');
    void this.router.navigate(['/checkout'], { queryParams: { function: id, seats } });
  }
}
