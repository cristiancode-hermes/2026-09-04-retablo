import { Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { TicketItem, money, madridWhen } from '../shared/models';

@Component({
  selector: 'app-confirm',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      @if (loading()) {
        <div class="sk"></div>
      } @else if (error()) {
        <section class="screen">
          <h2>No encontramos esa entrada</h2>
          <p>{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/mis-entradas">Mis entradas</a>
        </section>
      } @else if (ticket(); as t) {
        <h1>Butaca ocupada</h1>
        <p class="muted">{{ t.function?.show?.title }} · {{ t.function ? madridWhen(t.function.startsAt) : '' }}</p>
        <p>Código <code>{{ t.code }}</code> · {{ money(t.totalCents) }}</p>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        <p><a [href]="t.qrUrl">{{ t.qrUrl }}</a></p>
        <p><a class="btn btn-primary" [routerLink]="['/entrada', t.code]">Ver pase público</a></p>
      }
    </main>
  `,
})
export class ConfirmPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  readonly ticket = signal<TicketItem | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
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
        this.error.set('Esa entrada no existe.');
        this.loading.set(false);
      },
    });
  }
}
