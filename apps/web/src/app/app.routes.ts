import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage), canActivate: [guestGuard] },
  { path: 'entrar', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage), canActivate: [guestGuard] },
  { path: 'registro', loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPage), canActivate: [guestGuard] },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
      { path: 'obras', loadComponent: () => import('./pages/shows.page').then((m) => m.ShowsPage) },
      { path: 'obras/:id', loadComponent: () => import('./pages/show-detail.page').then((m) => m.ShowDetailPage) },
      { path: 'funciones/:id', loadComponent: () => import('./pages/function-detail.page').then((m) => m.FunctionDetailPage) },
      { path: 'checkout', loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPage), canActivate: [authGuard] },
      { path: 'confirmacion/:code', loadComponent: () => import('./pages/confirm.page').then((m) => m.ConfirmPage), canActivate: [authGuard] },
      { path: 'entrada/:code', loadComponent: () => import('./pages/public-ticket.page').then((m) => m.PublicTicketPage) },
      { path: 'mis-entradas', loadComponent: () => import('./pages/my-tickets.page').then((m) => m.MyTicketsPage), canActivate: [authGuard] },
      { path: 'mis-entradas/:code', loadComponent: () => import('./pages/my-ticket-detail.page').then((m) => m.MyTicketDetailPage), canActivate: [authGuard] },
      { path: 'cuenta', loadComponent: () => import('./pages/account.page').then((m) => m.AccountPage), canActivate: [authGuard] },
      { path: 'staff', loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPage), canActivate: [roleGuard(['staff', 'admin'])] },
      { path: 'staff/scan', loadComponent: () => import('./pages/staff-scan.page').then((m) => m.StaffScanPage), canActivate: [roleGuard(['staff', 'admin'])] },
      { path: 'admin', loadComponent: () => import('./pages/admin.page').then((m) => m.AdminPage), canActivate: [roleGuard(['admin'])] },
      { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) },
    ],
  },
];
