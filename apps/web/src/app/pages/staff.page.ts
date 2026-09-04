import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-staff',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <h1>Sala</h1>
      <p><a class="btn btn-primary" routerLink="/staff/scan">Escanear QR</a></p>
      <p class="muted">Hoy: sentadas {{ today().seated }} · entreacto {{ today().interval }} · telón {{ today().ended }}</p>
      <h2>Entradas cerradas, 14 días</h2>
      @if (points().length) {
        <svg class="chart" viewBox="0 0 560 220" role="img" [attr.aria-label]="'Entradas ended últimos 14 días'">
          <line x1="40" y1="180" x2="540" y2="180" stroke="currentColor" opacity="0.3"></line>
          <line x1="40" y1="20" x2="40" y2="180" stroke="currentColor" opacity="0.3"></line>
          @for (p of bars(); track p.date) {
            <rect [attr.x]="p.x" [attr.y]="p.y" [attr.width]="28" [attr.height]="p.h" fill="currentColor"></rect>
            <title>{{ p.date }}: {{ p.value }}</title>
            <text [attr.x]="p.x" [attr.y]="198" font-size="9">{{ p.date.slice(5) }}</text>
          }
        </svg>
      }
    </main>
  `,
})
export class StaffPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly today = signal({ seated: 0, interval: 0, ended: 0 });
  readonly points = signal<{ date: string; value: number }[]>([]);
  readonly bars = signal<{ date: string; value: number; x: number; y: number; h: number }[]>([]);

  ngOnInit(): void {
    this.api.today().subscribe({ next: (t) => this.today.set(t), error: () => undefined });
    this.api.endedStats().subscribe({
      next: (r) => {
        this.points.set(r.points);
        const max = Math.max(1, ...r.points.map((p) => p.value));
        this.bars.set(
          r.points.map((p, i) => {
            const h = (p.value / max) * 150;
            return { ...p, x: 48 + i * 35, y: 180 - h, h };
          }),
        );
      },
      error: () => undefined,
    });
  }
}
