import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FunctionItem, ShowItem, money, madridWhen } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <section class="hero">
        <div>
          <p class="kicker">Guiñol de barrio</p>
          <h1>Ocupa la butaca. El telón no espera.</h1>
          <p class="muted">Cartelera de esta semana. El «desde» sale del Patio, no de un cartel pintado.</p>
          <p><a class="btn btn-primary" routerLink="/obras">Ver cartelera</a></p>
        </div>
        <figure class="figure">
          <img src="/assets/retablo-cover.svg" alt="Retablo con telón carmín" />
          <figcaption>Boca del retablo, telón a medio alzar</figcaption>
        </figure>
      </section>

      @if (loading()) {
        <div class="sk"></div><div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>No pudimos abrir el cartel</h2>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else {
        <h2>Próximas funciones</h2>
        <div class="grid-shows">
          @for (fn of functions(); track fn.id) {
            <a class="card" [routerLink]="['/funciones', fn.id]">
              <h3>{{ fn.show?.title }}</h3>
              <p class="muted">{{ madridWhen(fn.startsAt) }}</p>
              <p>{{ fn.freeCount }} butacas libres</p>
            </a>
          }
        </div>
        <h2 style="margin-top:48px">En cartel</h2>
        @if (!shows().length) {
          <section class="screen">
            <h2>El retablo está a oscuras</h2>
            <p>Esta semana no hay obras. Vuelve cuando Maese Pedro tense las cuerdas.</p>
          </section>
        } @else {
          <div class="grid-shows">
            @for (s of shows(); track s.id) {
              <a class="card" [routerLink]="['/obras', s.id]">
                <figure class="figure">
                  <img [src]="s.imageUrl || '/assets/don-cristobal.svg'" [alt]="s.title" />
                  <figcaption>{{ s.caption }}</figcaption>
                </figure>
                <h3>{{ s.title }}</h3>
                <p class="muted">desde {{ money(s.fromPriceCents) }}</p>
              </a>
            }
          </div>
        }
      }
    </main>
  `,
})
export class HomePage implements OnInit {
  private readonly api = inject(ApiService);
  readonly shows = signal<ShowItem[]>([]);
  readonly functions = signal<FunctionItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly money = money;
  readonly madridWhen = madridWhen;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.shows().subscribe({
      next: (r) => {
        this.shows.set(r.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('El cartel no responde.');
        this.loading.set(false);
      },
    });
    this.api.functions().subscribe({
      next: (r) => this.functions.set(r.items.filter((f) => f.status === 'open').slice(0, 4)),
      error: () => undefined,
    });
  }
}
