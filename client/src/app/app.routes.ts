import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'timeline' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup/signup').then((m) => m.Signup),
  },
  {
    path: 'timeline',
    loadComponent: () => import('./features/timeline/timeline').then((m) => m.Timeline),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
    canActivate: [authGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./features/admin/admin-users').then((m) => m.AdminUsers),
    canActivate: [authGuard, adminGuard],
  },
  { path: '**', redirectTo: 'timeline' },
];
