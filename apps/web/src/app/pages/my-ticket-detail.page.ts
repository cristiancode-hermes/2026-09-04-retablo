import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { TicketItem, humanizeApiError, money, madridWhen } from '../shared/models';

@Component({
  selector: 'app-my-ticket-detail',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>Entrada no encontrada</h2>
          <a class="btn btn-primary" routerLink="/mis-entradas">Mis entradas</a>
        </section>
      } @else if (ticket(); as t) {
        <h1>{{ t.function?.show?.title }}</h1>
        <p class="muted">{{ t.function ? madridWhen(t.function.startsAt) : '' }} · {{ t.status }}</p>
        <p>Código <code>{{ t.code }}</code> · {{ money(t.totalCents) }}</p>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        <ol class="timeline">
          @for (step of t.timeline; track step.at + step.action) {
            <li>
              <strong>{{ step.label }}</strong>
              <div class="muted">{{ madridWhen(step.at) }}</div>
            </li>
          }
        </ol>
        @if (ctaError()) {
          <p class="cta-error">{{ ctaError() }}</p>
        }
        @if (t.status === 'confirmed') {
          <button class="btn btn-secondary" type="button" (click)="cancel(t)">Anular</button>
        }
      }
    </main>
  `,
})
export class MyTicketDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly ticket = signal<TicketItem | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly ctaError = signal('');
  readonly money = money;
  readonly madridWhen = madridWhen;

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.byCode(code).subscribe({
      next: (t) => {
        this.ticket.set(t);
        if (t.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(t.qrSvg));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('missing');
        this.loading.set(false);
      },
    });
  }

  cancel(t: TicketItem): void {
    this.ctaError.set('');
    this.api.cancel(t.id).subscribe({
      next: (fresh) => this.ticket.set(fresh),
      error: (err) => this.ctaError.set(humanizeApiError(err)),
    });
  }
}
