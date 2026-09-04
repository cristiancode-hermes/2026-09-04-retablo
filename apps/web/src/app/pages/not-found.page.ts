import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="screen">
      <h1>Página fuera de cartel</h1>
      <p>Esa ruta no existe en el retablo.</p>
      <a class="btn btn-primary" routerLink="/">Volver</a>
    </section>
  `,
})
export class NotFoundPage {}
