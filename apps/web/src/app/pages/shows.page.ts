import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ShowItem, money } from '../shared/models';

@Component({
  selector: 'app-shows',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <h1>Cartelera</h1>
      <p class="muted">El precio «desde» es el Patio. Palco y banco se ven en el mapa.</p>
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>Cartelera caída</h2>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!items().length) {
        <section class="screen">
          <h2>Sin obras esta semana</h2>
          <p>El retablo descansa. No hay funciones que vender.</p>
        </section>
      } @else {
        <div class="grid-shows">
          @for (s of items(); track s.id) {
            <a class="card" [routerLink]="['/obras', s.id]">
              <figure class="figure">
                <img [src]="s.imageUrl || '/assets/don-cristobal.svg'" [alt]="s.title" />
                <figcaption>{{ s.caption }}</figcaption>
              </figure>
              <h3>{{ s.title }}</h3>
              <p>{{ s.durationMin }} min · desde {{ money(s.fromPriceCents) }}</p>
            </a>
          }
        </div>
      }
    </main>
  `,
})
export class ShowsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly items = signal<ShowItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly money = money;

  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.shows().subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No cargó la cartelera.');
        this.loading.set(false);
      },
    });
  }
}
