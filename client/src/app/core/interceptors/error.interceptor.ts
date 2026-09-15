import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// A 401 from any authenticated route means the session is no longer valid
// (expired/invalid token) - log out globally. Login/signup returning 401 for
// wrong credentials is a normal, expected response, not a session problem.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth`);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthEndpoint) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
