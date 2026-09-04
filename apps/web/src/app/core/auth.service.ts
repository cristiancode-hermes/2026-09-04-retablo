import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, finalize, map } from 'rxjs';
import type { AuthResponse, User } from '../shared/models';
import { TOKEN_KEY, API } from '../shared/models';

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSignal = signal<User | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly pointsSignal = signal(0);
  private readonly tokenSignal = signal<string | null>(readStoredToken());

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly points = this.pointsSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal() && !!this.userSignal());
  readonly isStaff = computed(() => {
    const r = this.userSignal()?.role;
    return r === 'staff' || r === 'admin';
  });
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor() {
    queueMicrotask(() => this.bootstrap());
  }

  getToken(): string | null {
    return this.tokenSignal() ?? readStoredToken();
  }

  private setToken(token: string | null): void {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    this.tokenSignal.set(token);
  }

  setUser(user: User | null): void {
    this.userSignal.set(user);
    if (user) this.pointsSignal.set(user.points || 0);
  }

  bootstrap(): void {
    const token = this.getToken();
    if (!token) {
      this.userSignal.set(null);
      return;
    }
    this.loadingSignal.set(true);
    this.me()
      .pipe(
        catchError(() => {
          this.setToken(null);
          this.userSignal.set(null);
          return of(null);
        }),
        finalize(() => this.loadingSignal.set(false)),
      )
      .subscribe((u) => {
        if (u) {
          this.userSignal.set(u);
          this.pointsSignal.set(u.points || 0);
        }
      });
  }

  login(payload: { identifier: string; password: string }): Observable<AuthResponse> {
    this.loadingSignal.set(true);
    return this.http
      .post<AuthResponse>(`${API}/auth/login`, {
        identifier: payload.identifier,
        login: payload.identifier,
        usernameOrEmail: payload.identifier,
        password: payload.password,
      })
      .pipe(
        tap((res) => this.applyAuth(res)),
        finalize(() => this.loadingSignal.set(false)),
      );
  }

  register(body: { username: string; email: string; password: string }): Observable<AuthResponse> {
    this.loadingSignal.set(true);
    return this.http.post<AuthResponse>(`${API}/auth/register`, body).pipe(
      tap((res) => this.applyAuth(res)),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  me(): Observable<User> {
    return this.http.get<User>(`${API}/auth/profile`).pipe(
      map((res) => {
        if ((res as unknown as { user?: User }).user) {
          const wrapped = res as unknown as { user: User; points?: number };
          return { ...wrapped.user, points: wrapped.points ?? wrapped.user.points };
        }
        return res;
      }),
    );
  }

  logout(): void {
    this.setToken(null);
    this.userSignal.set(null);
    this.pointsSignal.set(0);
    void this.router.navigateByUrl('/');
  }

  revalidateSession(): void {
    const token = readStoredToken();
    this.tokenSignal.set(token);
    if (!token) {
      this.userSignal.set(null);
      this.pointsSignal.set(0);
      return;
    }
    const current = this.userSignal();
    if (current) {
      this.userSignal.set({ ...current });
      return;
    }
    this.bootstrap();
  }

  private applyAuth(res: AuthResponse): void {
    this.setToken(res.accessToken);
    this.userSignal.set(res.user);
    this.pointsSignal.set(res.user.points || 0);
  }
}
