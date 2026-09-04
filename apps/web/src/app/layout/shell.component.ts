import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/">Retablo</a>
      <button class="hamburger" type="button" (click)="open.set(!open())" [attr.aria-expanded]="open()" aria-label="Abrir menú">☰</button>
      <div class="drawer-backdrop" [class.open]="open()" (click)="open.set(false)"></div>
      <nav class="nav-links" [class.open]="open()">
        <a routerLink="/obras" (click)="open.set(false)">Cartelera</a>
        @if (auth.user(); as sessionUser) {
          <a routerLink="/mis-entradas" (click)="open.set(false)">Mis entradas</a>
          <a routerLink="/cuenta" (click)="open.set(false)">Cuenta</a>
          @if (sessionUser.role === 'staff' || sessionUser.role === 'admin') {
            <a routerLink="/staff" (click)="open.set(false)">Sala</a>
          }
          @if (sessionUser.role === 'admin') {
            <a routerLink="/admin" (click)="open.set(false)">Admin</a>
          }
          <button class="btn btn-ghost" type="button" (click)="auth.logout(); open.set(false)">Salir</button>
        } @else {
          <a class="btn btn-primary" routerLink="/login" (click)="open.set(false)">Entrar</a>
        }
        <button
          class="theme-toggle"
          type="button"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'"
        >
          {{ theme.isDark() ? '☀' : '☾' }}
        </button>
      </nav>
    </header>
    <router-outlet />
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly open = signal(false);
}
