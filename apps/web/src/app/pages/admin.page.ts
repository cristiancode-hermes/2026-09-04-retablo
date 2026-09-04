import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { FunctionItem, ShowItem, madridWhen } from '../shared/models';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  template: `
    <main class="wrap">
      <h1>Admin</h1>
      <h2>Funciones abiertas</h2>
      @for (fn of functions(); track fn.id) {
        <div class="card" style="margin-bottom:8px">
          <p>{{ fn.show?.title }} · {{ madridWhen(fn.startsAt) }} · {{ fn.status }}</p>
          @if (fn.status === 'open') {
            <button class="btn btn-secondary" type="button" (click)="close(fn.id)">Cerrar venta</button>
          }
        </div>
      }
      <h2>Nueva función</h2>
      <label class="form-field">Obra
        <select [ngModel]="showId()" (ngModelChange)="showId.set($event)">
          @for (s of shows(); track s.id) {
            <option [value]="s.id">{{ s.title }}</option>
          }
        </select>
      </label>
      <label class="form-field">Empieza (ISO)
        <input [ngModel]="startsAt()" (ngModelChange)="startsAt.set($event)" autocomplete="off" />
      </label>
      <button class="btn btn-primary" type="button" (click)="create()">Crear</button>
    </main>
  `,
})
export class AdminPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly shows = signal<ShowItem[]>([]);
  readonly functions = signal<FunctionItem[]>([]);
  readonly showId = signal('');
  readonly startsAt = signal(new Date(Date.now() + 86400_000).toISOString());
  readonly madridWhen = madridWhen;

  ngOnInit(): void {
    this.api.shows().subscribe({ next: (r) => { this.shows.set(r.items); if (r.items[0]) this.showId.set(r.items[0].id); } });
    this.refresh();
  }
  refresh(): void {
    this.api.functions().subscribe({ next: (r) => this.functions.set(r.items) });
  }
  close(id: string): void {
    this.api.adminCloseFunction(id).subscribe({ next: () => this.refresh() });
  }
  create(): void {
    this.api.adminCreateFunction({ showId: this.showId(), startsAt: this.startsAt() }).subscribe({ next: () => this.refresh() });
  }
}
