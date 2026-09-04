import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-account',
  template: `
    <main class="wrap">
      <h1>Cuenta</h1>
      @if (auth.user(); as u) {
        <p>{{ u.displayName }} · {{ u.email }}</p>
        <p>Puntos de palco: <strong>{{ u.points }}</strong></p>
        <p class="muted">Los puntos salen de funciones con telón bajado, no de un saldo de regalo.</p>
      }
    </main>
  `,
})
export class AccountPage {
  readonly auth = inject(AuthService);
}
