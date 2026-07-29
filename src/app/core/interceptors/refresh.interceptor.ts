import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

// Bandera a nivel de módulo: indica si ya hay un refresh en curso.
// Como los interceptores funcionales se re-ejecutan por cada petición pero
// comparten el mismo módulo, esta variable persiste entre invocaciones y
// permite detectar si otra petición ya disparó el POST /auth/refresh.
let isRefreshing = false;

// Mecanismo de serialización: mientras el refresh está en curso, este subject
// vale `null`. Las peticiones que reciben 401 durante ese lapso NO llaman a
// /auth/refresh de nuevo; en su lugar se "suscriben" a este subject y esperan
// a que emita el nuevo accessToken (filter descarta el valor inicial null).
// Cuando el refresh original termina, emite el token una sola vez y todas las
// peticiones en espera se reintentan con ese mismo token, evitando múltiples
// refresh simultáneos (condición de carrera con varios 401 a la vez).
const refreshedTokenSubject = new BehaviorSubject<string | null>(null);

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) => req.url.includes(endpoint));

  return next(req).pipe(
    catchError((error: unknown) => {
      const isTokenExpired =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        error.error?.error?.code === 'TOKEN_EXPIRED';

      if (isPublicEndpoint || !isTokenExpired) {
        return throwError(() => error);
      }

      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        authService.logout();
        return throwError(() => error);
      }

      if (!isRefreshing) {
        // Esta petición es la primera en detectar el token expirado: toma el
        // "rol" de renovar la sesión. Se marca isRefreshing = true de forma
        // síncrona antes de esperar la respuesta del backend, así cualquier
        // otra petición que falle mientras tanto entra por la rama de abajo
        // (else) en vez de disparar un segundo refresh en paralelo.
        isRefreshing = true;
        refreshedTokenSubject.next(null);

        return authService.refresh(refreshToken).pipe(
          switchMap((response) => {
            isRefreshing = false;
            // Se notifica el nuevo token a todas las peticiones que quedaron
            // esperando; a partir de aquí pueden reintentarse.
            refreshedTokenSubject.next(response.accessToken);
            return next(attachToken(req, response.accessToken));
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            // El refresh también falló (refreshToken inválido/expirado):
            // no se reintenta en bucle, se cierra sesión y se va a /login.
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      // Ya hay un refresh en curso disparado por otra petición: en vez de
      // llamar de nuevo a /auth/refresh, esta petición espera (sin bloquear
      // el hilo) a que refreshedTokenSubject emita el nuevo token y luego
      // se reintenta con él. `take(1)` evita reintentar en cada emisión futura.
      return refreshedTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        switchMap((token) => next(attachToken(req, token)))
      );
    })
  );
};

function attachToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
