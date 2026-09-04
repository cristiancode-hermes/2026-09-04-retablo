import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-staff-scan',
  imports: [FormsModule],
  template: `
    <main class="wrap">
      <h1>Escanear</h1>
      <p class="muted">Pega el código o la URL del pase.</p>
      <label class="form-field">
        Código o URL
        <input [ngModel]="code()" (ngModelChange)="code.set($event)" autocomplete="off" />
      </label>
      <label class="form-field">
        Acción
        <select [ngModel]="action()" (ngModelChange)="action.set($event)">
          <option value="seated">Sentar</option>
          <option value="interval">Entreacto</option>
          <option value="ended">Bajar telón</option>
        </select>
      </label>
      @if (msg()) {
        <p>{{ msg() }}</p>
      }
      @if (error()) {
        <p class="cta-error">{{ error() }}</p>
      }
      <button class="btn btn-primary" type="button" (click)="go()">Registrar</button>
    </main>
  `,
})
export class StaffScanPage {
  private readonly api = inject(ApiService);
  readonly code = signal('');
  readonly action = signal('seated');
  readonly msg = signal('');
  readonly error = signal('');

  go(): void {
    this.error.set('');
    this.msg.set('');
    this.api.scan({ codeOrUrl: this.code(), action: this.action(), voice: 'staff' }).subscribe({
      next: (t) => this.msg.set(t.message || 'Hecho'),
      error: (err) => this.error.set(humanizeApiError(err)),
    });
  }
}
