# PS1_PROYECTO_INVERSIONES_LR_FRONTEND

Frontend del **Marketplace de Alojamientos de Inversiones LR** (MVP). Aplicación web de una sola página (SPA) construida con **Angular 20** que consume los servicios REST del backend.

- Código del proyecto: `ILR-2026-10-10` · Programa de Ingeniería de Sistemas, Ingeniería de Software 1.
- Consume el backend real (Spring Boot) en `http://localhost:8080/api/v1`; su contrato está en `http://localhost:8080/swagger-ui.html`. El frontend **debe abrirse en `http://localhost:4200`**, el único origen que el CORS del backend permite.

## Contenido

1. [Estado de las funcionalidades](#estado-de-las-funcionalidades)
2. [Tecnologías](#tecnologías)
3. [Cómo ejecutarlo](#cómo-ejecutarlo)
4. [Servicios de Docker Compose](#servicios-de-docker-compose)
5. [Configuración y entornos](#configuración-y-entornos)
6. [Estructura del proyecto](#estructura-del-proyecto)
7. [Arquitectura](#arquitectura)
8. [Patrones de diseño](#patrones-de-diseño)
9. [Rutas y control de acceso](#rutas-y-control-de-acceso)
10. [Contrato con el API](#contrato-con-el-api)
11. [Pruebas y calidad](#pruebas-y-calidad)
12. [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)
13. [Solución de problemas](#solución-de-problemas)

---

## Estado de las funcionalidades

El proyecto avanza funcionalidad por funcionalidad, según la matriz de requerimientos.

| Requerimiento | Descripción | Estado |
|---|---|---|
| RF-USR-001 | Registro de usuario como Huésped o Anfitrión | Hecho |
| RF-USR-002 | Inicio de sesión | Hecho |
| RF-USR-003 / RNF-SEG-002 | Protección de rutas por rol y sin sesión | Hecho |
| RNF-ARQ-001 | Frontend desacoplado que consume servicios REST | Hecho |
| RNF-OPC-001 | Aplicación ejecutable en contenedores (Docker) | Hecho |
| RNF-MAN-001 / 002 | Quality Gate de SonarQube Cloud y revisión de cambios | Configurado (CI y plantilla de PR) |
| RF-USR-004 a 007 | Recuperar contraseña, perfil y activar/desactivar cuenta | Pendiente |
| RF-ALOJ, RF-BUS, RF-COT, RF-RES, RF-PAG | Publicaciones, búsqueda, cotización, reservas y pago simulado | Pendiente |
| RF-NOT, RF-RSC, RF-ADM, RF-DASH, RF-REP | Notificaciones, reseñas, administración, indicadores y reportes | Pendiente |

Las páginas `/marketplace`, `/anfitrion` y `/admin` son provisionales: solo muestran un mensaje hasta que se implementen sus historias.

## Tecnologías

| Área | Herramienta |
|---|---|
| Framework | Angular 20 (componentes *standalone*, signals, formularios reactivos) |
| Lenguaje | TypeScript 5.9 en modo estricto |
| Reactividad | Signals de Angular y RxJS 7.8 |
| Estilos | SCSS con variables CSS (*design tokens*); fuentes DM Sans y Fraunces |
| Pruebas | Karma + Jasmine (Chrome sin interfaz), con cobertura |
| Calidad | ESLint (con reglas de accesibilidad), Prettier, SonarQube Cloud |
| Contenedores | Docker y Docker Compose; nginx 1.27 como servidor |
| CI | GitHub Actions |
| Node.js | 22 LTS (ver `.nvmrc`) |

## Cómo ejecutarlo

### Opción A: con Docker (no necesitas instalar Node)

Requisito: Docker Desktop abierto.

```bash
docker compose up -d --build
```

Abre http://localhost:4200. Con la configuración por defecto (`development`) el navegador llama directo al backend en `http://localhost:8080/api/v1`, así que el backend debe estar levantado (por ejemplo, en su propio Docker). Para un build servido tras el proxy de nginx (`staging` o `production`, con la URL del API relativa `/api/v1`), pon `BUILD_CONFIGURATION` en `.env`.

Para programar con recarga automática al guardar (también en http://localhost:4200, así que no lo uses a la vez que el servicio anterior):

```bash
docker compose --profile dev up frontend-dev
```

Para detener todo:

```bash
docker compose down
```

### Opción B: con Node instalado

Requisitos: Node.js 20.19+, 22.12+ o 24 (recomendado 22, ver `.nvmrc`), npm 10+ y Google Chrome (para las pruebas).

```bash
npm install
npm start
```

Abre http://localhost:4200. `npm start` usa la configuración `development`, que llama directo al backend en `http://localhost:8080/api/v1`.

### Scripts de npm

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo con recarga automática (entorno development) |
| `npm run start:staging` | Servidor con la configuración de QA |
| `npm run build` | Build de producción en `dist/` |
| `npm run build:dev` / `build:staging` | Build de desarrollo / de QA |
| `npm test` | Pruebas unitarias en modo observador |
| `npm run test:ci` | Pruebas en Chrome sin interfaz, con cobertura en `coverage/` |
| `npm run lint` | ESLint sobre TypeScript y plantillas |
| `npm run format` | Da formato al código con Prettier |
| `npm run format:check` | Verifica el formato sin modificar archivos |

### Cuentas de prueba

No hay datos simulados: las cuentas Huésped y Anfitrión se crean desde `/registro` (se guardan en la base de datos del backend) y el Administrador lo carga el backend como dato inicial. La sesión dura 60 minutos (no hay renovación) y se conserva al recargar la página hasta cerrar la pestaña.

## Servicios de Docker Compose

Definidos en [`docker-compose.yml`](docker-compose.yml). Solo `frontend` arranca por defecto; los otros dos se activan con `--profile`.

| Servicio | Perfil | Para qué sirve | Puerto |
|---|---|---|---|
| `frontend` | (siempre) | Versión compilada, servida por nginx, que además reenvía `/api/` al backend | `4200` (`FRONTEND_PORT`) |
| `frontend-dev` | `dev` | `ng serve` con recarga automática, sin instalar Node | `4200` |
| `frontend-test` | `test` | Pruebas unitarias en Chrome sin interfaz | (ninguno) |

```bash
# Pruebas unitarias
docker compose --profile test run --rm frontend-test

# Lint dentro del contenedor
docker compose --profile test run --rm frontend-test npx ng lint
```

### Dockerfile (multi-etapa)

| Etapa | Qué hace |
|---|---|
| `deps` | Instala las dependencias con `npm ci` |
| `test` | Añade Chromium y ejecuta las pruebas |
| `build` | Compila con `ng build --configuration $BUILD_CONFIGURATION` |
| `runtime` | Imagen final: nginx con los archivos ya compilados (unos 50 MB) |

### nginx

[`docker/nginx/default.conf.template`](docker/nginx/default.conf.template):

- Sirve la SPA y devuelve `index.html` para cualquier ruta de Angular.
- Reenvía `/api/` a `BACKEND_URL`. Para el navegador todo es un solo origen, así que **no hay problemas de CORS**.
- Caché larga solo para archivos con hash en el nombre (`main-ABC12345.js`); el resto se revalida.
- Cabeceras de seguridad básicas (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

## Configuración y entornos

### Entornos de Angular

Cada entorno cumple la interfaz `AppEnvironment` ([`app-environment.ts`](src/environments/app-environment.ts)); `angular.json` reemplaza `environment.ts` por el archivo del entorno elegido.

| Entorno | Archivo | Comando | `apiUrl` | Nivel de log |
|---|---|---|---|---|
| development | `environment.development.ts` | `npm start` | `http://localhost:8080/api/v1` (directo, con CORS) | debug |
| staging (QA) | `environment.staging.ts` | `npm run build:staging` | `/api/v1` (proxy de nginx) | info |
| production | `environment.ts` | `npm run build` | `/api/v1` (proxy de nginx) | warn |

Nada de lo que está en `src/environments/` es secreto: termina dentro del código público del navegador.

**CORS y trazabilidad.** El backend solo admite los encabezados `Authorization`, `Content-Type` e `Idempotency-Key` desde `http://localhost:4200`. Por eso `X-Correlation-Id` solo se agrega a las peticiones del mismo origen (staging y production, detrás del proxy); en development se omite, porque el navegador bloquearía la petición.

### Variables de Docker Compose

Copia [`.env.example`](.env.example) como `.env` (no se sube a git):

| Variable | Por defecto | Para qué sirve |
|---|---|---|
| `BUILD_CONFIGURATION` | `development` | Entorno de Angular con el que se compila la imagen |
| `FRONTEND_PORT` | `4200` | Puerto local donde se publica nginx (debe ser 4200 por el CORS del backend) |
| `BACKEND_URL` | `http://host.docker.internal:8080` | Dónde está el backend, visto desde el contenedor |

### Proxy del servidor de desarrollo

[`proxy.conf.js`](proxy.conf.js) envía las peticiones a `/api` al backend (por defecto `http://localhost:8080`; se cambia con la variable `API_PROXY_TARGET`). Solo se usa con los entornos cuya `apiUrl` es relativa (`staging` y `production`).

### Herramientas de desarrollo

`.editorconfig`, `.prettierrc`, `eslint.config.js`, `tsconfig*.json` (con los alias `@core/*`, `@shared/*`, `@features/*` y `@env/*`) y la carpeta `.vscode/` con extensiones recomendadas y tareas de depuración.

## Estructura del proyecto

```
.
├── .github/
│   ├── workflows/ci-frontend.yml     CI: estilo, build, pruebas, cobertura y Sonar
│   └── pull_request_template.md      Plantilla de Pull Request
├── docker/nginx/                     Plantilla de configuración de nginx
├── public/                           Archivos estáticos
├── src/
│   ├── environments/                 Configuración por entorno
│   ├── styles.scss                   Design tokens y estilos globales
│   └── app/
│       ├── app.config.ts             Proveedores globales (router, HTTP, interceptores)
│       ├── app.routes.ts             Rutas raíz y guards por rol
│       ├── core/                     Servicios transversales (una sola instancia)
│       │   ├── config/               Token APP_CONFIG
│       │   ├── http/                 ApiError e interceptores (Correlation-Id, errores)
│       │   ├── logging/              LoggerService
│       │   ├── notifications/        ToastService (avisos)
│       │   └── tracking/             EventTrackerService (trazabilidad en cliente)
│       ├── shared/                   Piezas reutilizables sin lógica de negocio
│       │   ├── ui/toast-container/   Componente que muestra los avisos
│       │   └── validators/           Validadores y mensajes de error de formularios
│       └── features/                 Un módulo por funcionalidad de negocio
│           ├── auth/                 Registro, inicio de sesión y control de acceso
│           │   ├── domain/           Modelos, errores y el puerto AuthRepository
│           │   ├── data/             DTOs, mappers y repositorio HTTP
│           │   ├── application/      Facades, sesión, guards e interceptor de token
│           │   └── presentation/     Páginas (contenedores) y componentes (formularios)
│           ├── home/                 Portada pública
│           ├── marketplace/          Búsqueda y reservas (provisional)
│           ├── anfitrion/            Panel del anfitrión (provisional)
│           └── admin/                Panel de administración (provisional)
├── Dockerfile · docker-compose.yml · .env.example
├── angular.json · package.json · karma.conf.js · proxy.conf.js
└── sonar-project.properties
```

## Arquitectura

Combina tres ideas:

1. **Aplicación de una sola página (SPA)** que consume el API REST del backend (RNF-ARQ-001).
2. **Organización por funcionalidades**: cada módulo de negocio trae todo lo suyo en su propia carpeta y se carga de forma diferida (*lazy loading*) cuando se visita.
3. **Arquitectura por capas con inversión de dependencias**, cercana a la hexagonal (puertos y adaptadores): la lógica de negocio no depende de cómo se obtienen los datos.

Dentro de cada funcionalidad, las dependencias van hacia adentro:

```
presentation  →  application  →  domain  ←  data
 (pantallas)     (casos de uso)   (modelos     (HTTP, mappers,
                                   y puertos)   repositorio HTTP)
```

- `domain` no importa nada de las demás capas.
- Las pantallas nunca usan `HttpClient` ni repositorios: solo hablan con el *facade* de `application`.
- Una funcionalidad no importa archivos internos de otra; lo común va en `core` o `shared`.
- Las funcionalidades pueden usar `core` y `shared`, pero estos no importan nada de `features`.

### Conceptos aplicados

- **Principios SOLID**: responsabilidad única, inversión de dependencias (se depende de `AuthRepository`, no de HTTP) y sustitución (otra implementación del puerto, p. ej. un doble de pruebas, reemplaza a la real sin cambiar nada más).
- **Angular moderno**: componentes *standalone*, signals y `computed`, `OnPush` en todos los componentes, formularios reactivos tipados.
- **Seguridad**: control de acceso por rol declarado en cada ruta; token Bearer enviado solo a nuestro API; `returnUrl` validado contra redirecciones abiertas; mensaje genérico ante credenciales inválidas; contraseñas nunca en logs ni en la traza.
- **Trazabilidad**: `X-Correlation-Id` en cada petición y eventos de negocio sin datos personales (`USUARIO_REGISTRADO`, `SESION_INICIADA`, `INICIO_SESION_FALLIDO`).
- **Experiencia y accesibilidad**: bloqueo de dobles envíos, foco en el primer error, etiquetas asociadas, `aria-invalid`, `role="alert"` y diseño adaptable a celular.

## Patrones de diseño

| Patrón | Dónde | Qué resuelve |
|---|---|---|
| **Repository** | `AuthRepository` con `AuthHttpRepository` y `AuthMockRepository` | La lógica no sabe si los datos vienen del backend o de memoria |
| **Facade** | `RegistroUsuarioFacade`, `LoginFacade` | Un único punto para la pantalla; orquesta repositorio, sesión, aviso y trazabilidad |
| **Adapter / Mapper + DTO** | `RegistroUsuarioMapper`, `SesionMapper`, `*.dto.ts` | Traduce el JSON del API al modelo de dominio y normaliza los datos |
| **Contenedor / Presentación** | `registro-page` y `registro-form`, `login-page` y `login-form` | La página decide qué hacer; el formulario solo muestra y valida |
| **Chain of Responsibility** | Interceptores HTTP | Correlation-Id → token → manejo de errores, sin repetir código |
| **Strategy** | Validadores (`strongPassword`, `matchFields`, `notBlank`) | Reglas de validación intercambiables y combinables |
| **Observer** | Signals y RxJS | La pantalla se actualiza sola cuando cambia el estado |
| **Singleton** | Servicios `providedIn: 'root'` (sesión, logger, avisos) | Una sola instancia compartida |
| **Guard (control de acceso)** | `autenticadoGuard`, `rolGuard([...])`, `invitadoGuard` | Intercepta la navegación para aplicar permisos por rol |
| **Test double (Fake)** | `AuthMockRepository` | Permite desarrollar y demostrar sin backend |

## Rutas y control de acceso

| Ruta | Quién puede entrar |
|---|---|
| `/` | Todos (portada) |
| `/login` | Solo quien no tiene sesión |
| `/registro` (`?rol=anfitrion` preselecciona Anfitrión) | Solo quien no tiene sesión |
| `/marketplace` | Huésped |
| `/anfitrion` | Anfitrión |
| `/admin` | Administrador |
| `/acceso-denegado` ("Sin permisos") | Se muestra cuando hay sesión pero el rol no alcanza |

- Sin sesión, una ruta protegida lleva a `/login?returnUrl=…` y, tras iniciar sesión, vuelve a la página pedida.
- Quien ya tiene sesión y abre el login o el registro es enviado a su pantalla: Administrador a `/admin`, Anfitrión a `/anfitrion`, Huésped a `/marketplace`.
- La sesión (token y datos del usuario) se guarda en `sessionStorage`. Guarda también el vencimiento: al cumplirse el token (60 minutos) se cierra sola y lleva a `/login?expirada=true`; igual ocurre ante un 401 con la sesión abierta.
- Los guards solo mejoran la experiencia: **el backend debe validar el rol en cada petición**.

## Contrato con el API

Fuente de verdad: Swagger del backend (`http://localhost:8080/swagger-ui.html`, OpenAPI en `/v3/api-docs`). Prefijo configurado en `apiUrl` (ver [Entornos de Angular](#entornos-de-angular)). Cabeceras que envía el frontend: `Content-Type: application/json` y, con sesión, `Authorization: Bearer <token>` (nunca a login ni registro). No usa cookies ni `withCredentials`.

### `POST /auth/registro/huesped` y `POST /auth/registro/anfitrion`

Un solo formulario con botones de opción Huésped / Anfitrión; la opción elegida decide a qué endpoint se llama. **El rol no viaja en el cuerpo.**

```json
{
  "primerNombre": "Ana",
  "segundoNombre": null,
  "primerApellido": "Ruiz",
  "segundoApellido": null,
  "correo": "ana@correo.com",
  "contrasena": "********",
  "confirmarContrasena": "********"
}
```

| Respuesta | Qué muestra el frontend |
|---|---|
| `201` con `{ idUsuario, primerNombre, …, correo, rol, cuentaActiva }` | Aviso "¡Bienvenido, {nombre}!" y paso al login con el mensaje de cuenta creada (el registro **no** abre sesión) |
| `409` (correo ya registrado) | El `mensaje` del backend en el campo correo |
| `400` con `errores: { campo: mensaje }` | Cada mensaje bajo el control del mismo nombre |
| `400` sin `errores`, o sin red | Alerta general con el `mensaje` |
| `500` | Mensaje genérico, sin detalles técnicos |

Validaciones del formulario (iguales a las del backend): nombres y apellidos de hasta 50 caracteres, solo letras separadas por UN espacio, guion o apóstrofe; correo válido de hasta 254; contraseña de 8 a 64 caracteres con mayúscula, minúscula, número y carácter especial, sin espacios y de máximo 72 bytes en UTF-8. Los validadores recorren el texto carácter por carácter (sin expresiones regulares con grupos repetidos).

### `POST /auth/login`

Cuerpo `{ "correo": "...", "contrasena": "..." }`. En el login la contraseña solo es obligatoria.

| Respuesta | Qué hace el frontend |
|---|---|
| `200` con `{ token, tipo, expiraEn, usuario }` | Guarda la sesión (token + vencimiento `ahora + expiraEn × 1000`) y redirige según el rol |
| `401` | Siempre el mensaje genérico que llega ("Correo o contraseña incorrectos"); nunca indica si el correo existe ni el estado de la cuenta |

### `GET /auth/sesion`

Se llama al arrancar la app si hay un token guardado (`provideAppInitializer`) para recuperar el usuario y el rol. Si responde `401` se limpia la sesión y se lleva a `/login?expirada=true`.

### Errores y sesión

Todos los endpoints devuelven `{ fecha, estado, error, mensaje, ruta, errores? }`. `401` en una ruta protegida: cierra la sesión y lleva a `/login?expirada=true`. `403`: aviso "Sin permisos" con el `mensaje`, sin cerrar la sesión. Un temporizador cierra la sesión sola al vencer el token (60 minutos, sin renovación).

### Trazabilidad

El registro oficial de auditoría (tabla `evento_auditoria`) lo escribe el backend en la misma transacción que la acción. El frontend solo agrega el `X-Correlation-Id` y envía eventos de negocio a `POST /events` cuando `tracking.remote` está activo.

## Pruebas y calidad

- **Pruebas unitarias** con Karma y Jasmine: 120 pruebas en 16 archivos. Cada capa se prueba aislada: validadores y mappers (funciones puras), repositorio HTTP con `HttpTestingController`, facades con repositorios falsos, guards, interceptores y componentes sobre su DOM.
- **Cobertura**: `npm run test:ci` genera `coverage/` con reporte HTML y `lcov.info` (que lee Sonar).
- **Lint y formato**: `npm run lint` y `npm run format:check` deben quedar limpios antes de abrir un Pull Request.

### Integración continua

[`ci-frontend.yml`](.github/workflows/ci-frontend.yml) corre en cada Pull Request y en cada push a `develop` o `main`:

1. Instala dependencias (`npm ci`).
2. ESLint y Prettier.
3. Build de producción.
4. Pruebas con cobertura en Chrome sin interfaz.
5. Análisis de SonarQube Cloud, que falla si no pasa el Quality Gate. Necesita el secret `SONAR_TOKEN` y los valores reales de `sonar.organization` y `sonar.projectKey` en [`sonar-project.properties`](sonar-project.properties); se omite en forks, que no tienen secrets.
6. Guarda la cobertura como artefacto.

## Flujo de trabajo con Git

Recorrido del código: **historia → feature → develop → main**. Cada salto se hace con un Pull Request y el CI debe estar en verde antes de fusionar. No se salta ningún escalón.

La [plantilla de Pull Request](.github/pull_request_template.md) pide la clave de Jira (`MAR-…`, también en el título), los criterios de aceptación cubiertos, la evidencia (pruebas, Quality Gate, contrato OpenAPI) y la revisión de al menos otro integrante del equipo.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `error during connect` al usar Docker | Docker Desktop no está abierto | Abrirlo y esperar a que diga "Engine running" |
| `port is already allocated` | El puerto 4200 está ocupado (p. ej. por `frontend-dev` u otro contenedor) | Cambiar `FRONTEND_PORT` en `.env` o cerrar lo que lo usa |
| El registro o el login muestran un error de conexión (nginx responde 502) | No hay backend en `BACKEND_URL` | Levantar el backend (con `BUILD_CONFIGURATION=development` el navegador lo llama directo en el 8080) |
| Cambié código y la página sigue igual | Se reutilizó la imagen anterior o el navegador guardó archivos viejos | `docker compose up -d --build` y recarga forzada con Ctrl + Shift + R |
| `npm ci` falla por el archivo lock | `package.json` cambió y `package-lock.json` no | Regenerar el lock con `npm install` y volver a intentar |
| Las pruebas no encuentran Chrome | Chrome no está instalado | Instalarlo, o ejecutar las pruebas con Docker |
