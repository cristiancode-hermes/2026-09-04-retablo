import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { TicketItem, money, madridWhen } from '../shared/models';

@Component({
  selector: 'app-my-tickets',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <h1>Mis entradas</h1>
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>No cargaron las entradas</h2>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!items().length) {
        <section class="screen">
          <h2>Aún no tienes butaca</h2>
          <p>Elige una función y marca asiento.</p>
          <a class="btn btn-primary" routerLink="/obras">Cartelera</a>
        </section>
      } @else {
        <p class="muted">Total {{ money(sum()) }}</p>
        @for (t of items(); track t.id) {
          <a class="card" style="display:block;margin-bottom:8px" [routerLink]="['/mis-entradas', t.code]">
            <strong>{{ t.function?.show?.title }}</strong>
            <p class="muted">{{ t.function ? madridWhen(t.function.startsAt) : '' }} · {{ t.status }} · {{ money(t.totalCents) }}</p>
          </a>
        }
      }
    </main>
  `,
})
export class MyTicketsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly items = signal<TicketItem[]>([]);
  readonly sum = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly money = money;
  readonly madridWhen = madridWhen;

  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.api.myTickets().subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.sum.set(r.totalCentsSum);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('fail');
        this.loading.set(false);
      },
    });
  }
}
