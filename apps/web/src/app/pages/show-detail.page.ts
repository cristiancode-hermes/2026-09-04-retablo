import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ShowItem, money, madridWhen } from '../shared/models';

@Component({
  selector: 'app-show-detail',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>Obra no encontrada</h2>
          <p>{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/obras">Volver a cartelera</a>
        </section>
      } @else if (show(); as s) {
        <figure class="figure">
          <img [src]="s.imageUrl || '/assets/don-cristobal.svg'" [alt]="s.title" />
          <figcaption>{{ s.caption }}</figcaption>
        </figure>
        <h1>{{ s.title }}</h1>
        <p>{{ s.synopsis }}</p>
        <p class="muted">{{ s.durationMin }} min · desde {{ money(s.fromPriceCents) }}</p>
        <h2>Funciones</h2>
        @for (fn of s.functions || []; track fn.id) {
          <a class="card" style="display:block;margin-bottom:8px" [routerLink]="['/funciones', fn.id]">
            <strong>{{ madridWhen(fn.startsAt) }}</strong>
            <p class="muted">{{ fn.freeCount }} libres de {{ fn.seatTotal }} · {{ fn.status === 'open' ? 'Venta abierta' : 'Cerrada' }}</p>
          </a>
        }
      }
    </main>
  `,
})
export class ShowDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly show = signal<ShowItem | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly money = money;
  readonly madridWhen = madridWhen;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.show(id).subscribe({
      next: (s) => {
        this.show.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Esa obra no está en cartel.');
        this.loading.set(false);
      },
    });
  }
}
