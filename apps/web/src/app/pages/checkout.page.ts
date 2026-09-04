import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FunctionItem, PlaybillItem, SeatItem, humanizeApiError, money, madridWhen } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule],
  template: `
    <main class="wrap">
      <h1>Pagar butacas</h1>
      @if (loading()) {
        <div class="sk"></div>
      } @else if (loadError()) {
        <section class="screen">
          <h2>No hay mapa para esta función</h2>
          <p>{{ loadError() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else {
        <p class="muted">{{ fn()?.show?.title }} · {{ fn() ? madridWhen(fn()!.startsAt) : '' }}</p>
        <ul>
          @for (s of chosen(); track s.id) {
            <li>{{ s.label }} · {{ s.zoneName }} · {{ money(s.priceCents) }}</li>
          }
        </ul>
        <label class="form-field">
          Programa de mano ({{ money(playbill()?.priceCents || 0) }}, stock {{ playbill()?.stock || 0 }})
          <input type="number" min="0" max="4" [ngModel]="qty()" (ngModelChange)="qty.set(+$event || 0)" />
        </label>
        <p><strong>Total {{ money(total()) }}</strong></p>
        @if (ctaError()) {
          <p id="pay-action" class="cta-error">{{ ctaError() }}</p>
        }
        <p>
          <button id="pay-action" class="btn btn-primary" type="button" [disabled]="paying()" (click)="pay()">Pagar ahora</button>
        </p>
      }
    </main>
  `,
})
export class CheckoutPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly fn = signal<FunctionItem | null>(null);
  readonly seats = signal<SeatItem[]>([]);
  readonly playbill = signal<PlaybillItem | null>(null);
  readonly qty = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly ctaError = signal('');
  readonly paying = signal(false);
  readonly money = money;
  readonly madridWhen = madridWhen;
  private seatIds: string[] = [];
  private functionId = '';

  readonly chosen = computed(() => this.seats().filter((s) => this.seatIds.includes(s.id)));
  readonly total = computed(() => {
    const seats = this.chosen().reduce((n, s) => n + s.priceCents, 0);
    return seats + this.qty() * (this.playbill()?.priceCents || 0);
  });

  ngOnInit(): void {
    this.functionId = this.route.snapshot.queryParamMap.get('function') || '';
    this.seatIds = (this.route.snapshot.queryParamMap.get('seats') || '').split(',').filter(Boolean);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.api.seats(this.functionId).subscribe({
      next: (r) => {
        this.fn.set(r.function);
        this.seats.set(r.seats);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('La función no está a la venta.');
        this.loading.set(false);
      },
    });
    this.api.playbills().subscribe({
      next: (r) => this.playbill.set(r.items[0] || null),
      error: () => undefined,
    });
  }

  pay(): void {
    this.ctaError.set('');
    this.paying.set(true);
    this.api
      .checkout({ functionId: this.functionId, seatIds: this.seatIds, playbillQty: this.qty() || undefined })
      .subscribe({
        next: (t) => {
          this.paying.set(false);
          void this.router.navigate(['/confirmacion', t.code]);
        },
        error: (err) => {
          this.paying.set(false);
          this.ctaError.set(humanizeApiError(err));
          document.getElementById('pay-action')?.scrollIntoView({ block: 'center' });
        },
      });
  }
}
