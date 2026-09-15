import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { User } from '../models/user.model';

const TOKEN_KEY = 'poc_token';

interface AuthPayload {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Called once at app startup (see app.config.ts) so a refresh doesn't bounce
  // a logged-in user back to the login screen.
  async restoreSession(): Promise<void> {
    const token = this.getToken();
    if (!token) return;

    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<{ user: User }>>(`${environment.apiUrl}/users/me`)
      );
      this.currentUser.set(res.data.user);
    } catch {
      this.clearSession();
    }
  }

  signup(payload: { name: string; email: string; password: string }) {
    return this.http
      .post<ApiResponse<AuthPayload>>(`${this.base}/signup`, payload)
      .pipe(tap((res) => this.setSession(res.data)));
  }

  login(payload: { email: string; password: string }) {
    return this.http
      .post<ApiResponse<AuthPayload>>(`${this.base}/login`, payload)
      .pipe(tap((res) => this.setSession(res.data)));
  }

  logout(): void {
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  // Used after profile edits so the navbar/profile page reflect changes
  // without a full re-fetch.
  setCurrentUser(user: User): void {
    this.currentUser.set(user);
  }

  private setSession({ token, user }: AuthPayload): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.currentUser.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUser.set(null);
  }
}
