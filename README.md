# Mesa de Ayuda (Help Desk) — Frontend

Proyecto académico del SENA (programa ADSI, Quinto Trimestre) que implementa el frontend en Angular para una API REST de Mesa de Ayuda ya desplegada. El backend gestiona usuarios, tickets y comentarios con control de acceso por rol (`admin`, `agent`, `client`); este proyecto consume esa API para ofrecer autenticación con renovación automática de sesión, gestión de tickets y administración de usuarios.

## Instalación y ejecución

```bash
npm install
npm start        # equivalente a: ng serve
```

La aplicación queda disponible en `http://localhost:4200/`.

En desarrollo, las peticiones a `/api/*` se redirigen mediante `proxy.conf.json` (registrado en `angular.json` como `serve.options.proxyConfig`) hacia `https://sla-api.areasoftccyt.com`, evitando problemas de CORS sin necesidad de tocar la configuración del navegador. En producción (`ng build`), `environment.ts` apunta directamente a la URL completa del API.

## Credenciales de prueba

| Rol | Email | Contraseña |
|---|---|---|
| admin | admin@helpdesk.dev | Admin123! |
| agent | agent1@helpdesk.dev | Agent123! |
| client | client1@helpdesk.dev | Client123! |

> Los datos del backend se reinician cada vez que el servidor se reinicia (IDs de tickets, usuarios y comentarios cambian). El frontend nunca asume IDs fijos: todo se obtiene dinámicamente de las respuestas del API.

## Estructura de carpetas

```
src/app/
├── core/                 # Infraestructura transversal, sin UI propia
│   ├── models/           # Interfaces TypeScript (User, Ticket, Comment, DTOs)
│   ├── services/         # AuthService, TicketService, UserService
│   ├── interceptors/     # auth.interceptor, refresh.interceptor
│   └── guards/            # auth.guard, role.guard
├── features/             # Pantallas de negocio, organizadas por dominio
│   ├── auth/             # login, register
│   ├── tickets/          # ticket-list, ticket-detail, ticket-create
│   └── users/            # user-list
└── layout/               # Shell visual (header, navegación, logout) para rutas protegidas
```

**`core/`** contiene todo lo que no depende de una pantalla concreta: modelos de datos, servicios HTTP, e interceptores/guards que se registran una sola vez en `app.config.ts` / `app.routes.ts`. **`features/`** contiene componentes standalone de una sola pantalla, agrupados por el dominio al que pertenecen (auth, tickets, users), cada uno con sus propios reactive forms y su propia lógica de presentación.

## Preguntas de sustentación

### ¿Por qué existen dos tokens (access y refresh)?

Son dos tokens con propósitos y niveles de riesgo distintos. El **access token** viaja en el header `Authorization` de cada petición y por eso es el que más expuesto está a robo (XSS, logs, herramientas de red); se le da una vida corta (15 minutos) para que, si se filtra, la ventana de abuso sea pequeña. El **refresh token** solo se usa una vez cada renovación, viaja únicamente hacia el endpoint `/api/auth/refresh`, y por eso puede vivir mucho más tiempo (7 días) sin exponer al usuario a un riesgo proporcional. Esta separación evita el dilema de "sesión larga cómoda para el usuario" vs. "token de corta vida por seguridad": se consiguen ambas cosas repartiendo la responsabilidad entre los dos tokens.

### ¿Dónde se almacenan los tokens en este proyecto y por qué (tradeoffs frente a otras opciones como cookies httpOnly)?

Se almacenan en `localStorage` (ver `AuthService.storeSession`). Se eligió `localStorage` porque el backend expone los tokens directamente en el cuerpo JSON de la respuesta (no los fija como cookies), así que es el propio frontend quien decide dónde guardarlos, y `localStorage` es la opción más simple para un SPA sin backend propio que orqueste cookies. El tradeoff es de seguridad: cualquier script que logre ejecutarse en la página (un ataque XSS) puede leer `localStorage` y robar los tokens, mientras que una cookie `httpOnly` es invisible para JavaScript y por tanto inmune a ese vector concreto. A cambio, las cookies `httpOnly` introducen su propia complejidad (manejo de `SameSite`/CSRF, necesidad de que el backend las fije con las cabeceras correctas, problemas con dominios cruzados) que este backend no soporta actualmente. Para un entorno productivo real se preferiría que el backend emitiera el refresh token como cookie `httpOnly` + `Secure` + `SameSite=Strict`, dejando el access token en memoria (una variable de JS, no en `localStorage`) para reducir aún más la superficie de ataque.

### ¿Cómo determina el guard si existe una sesión válida?

`authGuard` (en `core/guards/auth.guard.ts`) consulta el signal `AuthService.isAuthenticated`, un `computed` que es `true` cuando `currentUser` (un `signal<User | null>`) no es `null`. Ese signal se inicializa leyendo `localStorage` al arrancar la aplicación y se actualiza cada vez que `login`, `register` o `refresh` guardan una nueva sesión, o cuando `logout` la limpia. Es una comprobación puramente local y síncrona: el guard no hace ninguna petición al backend para validar el token en el momento de navegar; simplemente confía en que exista un usuario guardado. La validación real de si el access token sigue siendo válido ocurre de forma natural en la primera petición HTTP que se haga en esa pantalla: si el token expiró, el backend responde 401 y entra en juego el `refreshInterceptor`.

### ¿Qué ocurre en este proyecto cuando varias peticiones reciben 401 simultáneamente (explicar el mecanismo de serialización implementado)?

`refresh.interceptor.ts` implementa el mecanismo con dos piezas: una bandera de módulo `isRefreshing` y un `BehaviorSubject<string | null>` llamado `refreshedTokenSubject`. Cuando una petición recibe 401 con `code: 'TOKEN_EXPIRED'`, el interceptor revisa `isRefreshing`. Si es `false`, esa petición "toma el rol" de renovar: marca `isRefreshing = true` de inmediato (de forma síncrona, antes de esperar cualquier respuesta) y llama a `POST /auth/refresh`. Cualquier otra petición que falle con el mismo error *mientras ese refresh sigue en curso* encuentra `isRefreshing` en `true` y, en lugar de disparar su propio refresh, se suscribe al `BehaviorSubject` y espera (con `filter` + `take(1)`) a que emita el nuevo access token. Cuando el refresh original termina, emite el token nuevo por el subject; todas las peticiones que estaban esperando se reintentan automáticamente con ese mismo token. Esto garantiza que, sin importar cuántas peticiones fallen a la vez, solo se ejecuta **una** llamada a `/auth/refresh`, evitando condiciones de carrera donde varios refresh simultáneos podrían invalidarse entre sí (dado que el backend rota el refresh token en cada uso). Si el refresh falla, se cierra sesión y se redirige a `/login` sin reintentar en bucle.

### ¿Cuál es la diferencia entre 401 y 403, y dónde se usa cada uno en esta app?

**401 (Unauthorized)** significa "no sé quién eres" o "tu credencial no es válida": ocurre cuando no se envía token, el token es inválido, o expiró (`TOKEN_EXPIRED`). Es el único código que dispara el flujo de renovación en `refreshInterceptor`, porque un 401 sugiere que renovar el token podría resolver el problema. **403 (Forbidden)** significa "sé quién eres, pero no tienes permiso para esto": por ejemplo, un `client` intentando hacer `PATCH` sobre un ticket, o un `agent` intentando acceder a `/api/users`. Renovar el token no cambia nada en ese caso, así que el interceptor de refresh lo ignora y el error se propaga tal cual a cada componente, que muestra el mensaje de error del backend (`error.error.message`) en la UI.

### ¿Cómo se restringen funcionalidades según el rol sin depender únicamente de la interfaz (o sea, qué pasa si alguien intenta llamar a la API directamente sin pasar por la UI)?

En este frontend, ocultar un botón o una ruta (`roleGuard`, `*ngIf`/`@if` sobre el rol) es solo una capa de **conveniencia de UI**, no de seguridad: evita que un usuario legítimo se confunda o intente una acción que sabe de antemano que fallará, pero no impide que alguien use `curl`, Postman o la consola del navegador para llamar directamente a la API con su propio token. La autorización real vive exclusivamente en el backend: cada endpoint valida el rol del usuario autenticado (a partir del JWT) antes de ejecutar la operación, y devuelve 403 si no corresponde (por ejemplo, `PATCH /api/tickets/:id` rechaza a un `client` sin importar lo que el frontend le haya permitido intentar). Por eso todas las llamadas HTTP en este proyecto pasan igualmente por `authInterceptor`, que adjunta el token real del usuario autenticado: si alguien intenta manipular el DOM o saltarse el guard para alcanzar una pantalla restringida, seguiría autenticado como su propio usuario y el backend rechazaría cualquier operación fuera de su rol. El frontend nunca es la última línea de defensa; es una guía visual sobre una autorización que el servidor ya aplica de forma independiente.
