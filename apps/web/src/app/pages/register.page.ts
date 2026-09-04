import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-panel">
      <div class="auth-visual">
        <img src="/assets/retablo-cover.svg" alt="Boca del retablo" />
        <div class="auth-visual-overlay">
          <p class="kicker" style="color:#E0C37A">RETABLO</p>
          <h1 style="color:#fff">Alta de vecino.</h1>
        </div>
      </div>
      <div class="auth-form-side">
        <form class="auth-form" (ngSubmit)="submit()">
          <h2>Registro</h2>
          <label class="form-field">Usuario
            <input name="username" [ngModel]="username()" (ngModelChange)="username.set($event)" autocomplete="off" required />
          </label>
          <label class="form-field">Email
            <input name="email" [ngModel]="email()" (ngModelChange)="email.set($event)" autocomplete="off" required />
          </label>
          <label class="form-field">Contraseña
            <input type="password" name="password" [ngModel]="password()" (ngModelChange)="password.set($event)" autocomplete="new-password" required />
          </label>
          @if (error()) { <p class="cta-error">{{ error() }}</p> }
          <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">Crear cuenta</button>
          <p><a routerLink="/login">Ya tengo entrada</a></p>
        </form>
      </div>
    </div>
  `,
})
export class RegisterPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit(): void {
    this.error.set('');
    this.auth
      .register({ username: this.username(), email: this.email(), password: this.password() })
      .subscribe({
        next: () => {
          this.auth.revalidateSession();
          void this.router.navigateByUrl('/');
        },
        error: (err) => this.error.set(humanizeApiError(err)),
      });
  }
}
