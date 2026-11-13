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
| RF-USR-004 | Recuperar la contraseña de forma simulada (HU-004): solicitud y nueva contraseña | Hecho |
| RF-USR-005 a 007 | Perfil y activar/desactivar cuenta | Pendiente |
| RF-ALOJ, RF-BUS, RF-COT, RF-RES, RF-PAG | Publicaciones, búsqueda, cotización, reservas y pago simulado | Pendiente |
| RF-USR-004 a 007 | Recuperar contraseña, perfil y activar/desactivar cuenta | Pendiente |
| RF-ALOJ (HU-008) | Crear una publicación de alojamiento (Anfitrión), guardada como borrador | Hecho (pendiente de probar contra el backend con los endpoints de publicaciones) |
| RF-ALOJ (HU-009) | Editar una publicación propia (Anfitrión) en BORRADOR o PAUSADA | Hecho (pendiente de probar contra el backend con GET y PUT de publicaciones) |
| RF-ALOJ (HU-010) | Consultar mis publicaciones (Anfitrión): listado paginado con el estado de cada una | Hecho |
| RF-ALOJ (HU-011) | Editar una publicación con autorización administrativa (Administrador), con motivo registrado | Hecho |
| RF-ALOJ (HU-012) | Solicitar la activación de una publicación (Anfitrión): envío del borrador a revisión | Hecho |
| RF-ALOJ (HU-013) | Revisar una publicación pendiente (Administrador): bandeja, aprobar o rechazar con motivo | Hecho |
| RF-ALOJ (HU-014) | Pausar una publicación activa (Anfitrión) y listado público de alojamientos disponibles | Hecho |
| RF-ADM (HU-015) | Bloquear una publicación engañosa y reactivar una pausada o bloqueada (Administrador), con motivo; el Anfitrión ve el motivo del bloqueo | Hecho |
| RF-ALOJ (resto), RF-BUS, RF-COT, RF-RES, RF-PAG | Listado y edición de publicaciones, búsqueda, cotización, reservas y pago simulado | Pendiente |
| RF-NOT, RF-RSC, RF-ADM, RF-DASH, RF-REP | Notificaciones, reseñas, administración, indicadores y reportes | Pendiente |

Las páginas `/anfitrion` (salvo las de publicaciones) y `/admin` (salvo la gestión de publicaciones) son provisionales: solo muestran un mensaje hasta que se implementen sus historias.

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
│           ├── alojamientos/         Listado público de alojamientos disponibles
│           ├── marketplace/          Marketplace del Huésped (reutiliza el listado de alojamientos)
│           ├── anfitrion/            Panel del anfitrión (provisional)
│           └── admin/                Panel de administración y gestión de publicaciones
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
| `/alojamientos` | Todos (listado público de alojamientos disponibles, sin sesión) |
| `/marketplace` | Huésped (el mismo listado de alojamientos disponibles) |
| `/recuperar-contrasena` y `/restablecer-contrasena` (`?token=…`) | Solo quien no tiene sesión |
| `/marketplace` | Huésped |
| `/anfitrion` | Anfitrión |
| `/anfitrion/publicaciones` | Anfitrión (Mis publicaciones: listado paginado de las suyas) |
| `/anfitrion/publicaciones/nueva` | Anfitrión (formulario de nueva publicación) |
| `/anfitrion/publicaciones/:id` | Anfitrión propietario (detalle de una publicación; se abre desde el listado) |
| `/anfitrion/publicaciones/:id/editar` | Anfitrión propietario (editar una publicación; pide confirmación si hay cambios sin guardar) |
| `/admin` | Administrador (panel con los accesos a la gestión de publicaciones y a la bandeja de pendientes) |
| `/admin/publicaciones` | Administrador (gestión de publicaciones: pestañas Pendientes, Activas, Pausadas, Bloqueadas y Todas; bloquear y reactivar con motivo) |
| `/admin/publicaciones/pendientes` | Administrador (bandeja de publicaciones pendientes de revisión: aprobar o rechazar con motivo) |
| `/admin/publicaciones/:id` | Administrador (detalle de una publicación, con el motivo del bloqueo y sus acciones) |
| `/admin/publicaciones/:id/editar` | Administrador (intervenir una publicación con un motivo; pide confirmación si hay cambios sin guardar) |
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

### Recuperación de contraseña simulada (HU-004)

Dos endpoints públicos: el frontend **no envía `Authorization`** y el interceptor de autenticación los ignora.

| Método y ruta | Cuerpo | Uso |
|---|---|---|
| `POST /auth/recuperacion/solicitud` | `{ "correo": "..." }` | Pedir las instrucciones de recuperación |
| `POST /auth/recuperacion/restablecer` | `{ "token": "...", "contrasena": "...", "confirmarContrasena": "..." }` | Fijar la nueva contraseña con el código recibido |

| Respuesta | Qué hace el frontend |
|---|---|
| Solicitud `202` con `{ mensaje }` | Reemplaza el formulario por ese mensaje. Es el mismo exista o no el correo (o esté la cuenta inactiva), así que la pantalla nunca revela si el correo existe |
| Solicitud `400` con `errores.correo` | El mensaje junto al campo |
| Restablecer `200` con `{ mensaje }` | Estado de éxito con el mensaje y el botón "Ir a iniciar sesión" |
| Restablecer `400` con `errores` (`token`, `contrasena`, `confirmarContrasena`) | Cada mensaje junto a su campo y el foco en el primero |
| Restablecer `400` sin `errores` | El enlace no sirve (token inexistente, vencido o ya usado, con el mismo mensaje en los tres casos): muestra el mensaje y el botón "Solicitar un nuevo enlace" |
| Red o `5xx` | Mensaje genérico; el formulario conserva lo escrito |

**Pantallas.** `/recuperar-contrasena` (correo, hasta 254 caracteres) y `/restablecer-contrasena`. El código llega en `?token=...`: se lee al abrir la pantalla, se guarda solo en memoria del componente y se quita de la URL con `replaceUrl`; si no viene, hay un campo para pegarlo. Ambas rutas son solo para quien no tiene sesión, y el login tiene el enlace "¿Olvidaste tu contraseña?".

**Contraseña.** La misma regla del registro (de 8 a 64 caracteres, mayúscula, minúscula, número, carácter especial, sin espacios, máximo 72 bytes en UTF-8). El checklist en vivo y el validador usan la misma función (`analizarContrasena`), así que no hay dos versiones de la regla.

**Seguridad.** El token y las contraseñas no se escriben en consola, `localStorage` ni `sessionStorage`, y no van a la traza del cliente (los eventos `RECUPERACION_SOLICITADA`, `CONTRASENA_RESTABLECIDA` y `RESTABLECIMIENTO_FALLIDO` llevan como mucho el motivo).

**Modo simulado.** El correo no se envía: el backend escribe el token en su log como `CORREO_SIMULADO_RECUPERACION`. Fuera de producción, las pantallas muestran una nota que lo recuerda, y tras solicitar aparece el enlace "Ya tengo mi código de recuperación".

### `GET /auth/sesion`

Se llama al arrancar la app si hay un token guardado (`provideAppInitializer`) para recuperar el usuario y el rol. Si responde `401` se limpia la sesión y se lleva a `/login?expirada=true`.

### Publicaciones (HU-008)

| Método y ruta | Acceso | Uso |
|---|---|---|
| `GET /ciudades` | Cualquier rol con token | Lista desplegable de ciudades (`[{ id, nombre }]`, ordenadas por nombre) |
| `GET /tipos-alojamiento` | Cualquier rol con token | Tipos de alojamiento, que el formulario muestra como opciones |
| `POST /publicaciones` | Solo ANFITRION | Crea la publicación en estado BORRADOR |

Cuerpo del POST: `titulo`, `descripcion`, `direccionTextual`, `idCiudad`, `barrioZona` (opcional, `null` si queda vacío), `idTipo`, `capacidad` (entero) y `precioNoche` (número, máximo 2 decimales), enviados como números. **No se envían** `idAnfitrion`, `estado` ni `politica`: los fija el servidor. Un `201` devuelve la publicación (estado `BORRADOR`, política "Flexible", `tarifaLimpieza` 0) y el frontend muestra una ficha de confirmación; un `400` con `errores` se muestra bajo cada campo.

Límites del formulario (iguales a los del backend): título 150, descripción 1000 (con contador), dirección 250 y barrio o zona 120 caracteres; capacidad entera mayor que 0; precio mayor que 0, con punto decimal (no coma), máximo 2 decimales y 10 enteros.

### Editar una publicación (HU-009)

| Método y ruta | Acceso | Uso |
|---|---|---|
| `GET /publicaciones/{id}` | Solo ANFITRION propietario | Cargar la publicación para precargar el formulario |
| `PUT /publicaciones/{id}` | Solo ANFITRION propietario | Guardar los cambios (reemplaza todos los campos editables) |

El cuerpo del PUT lleva **todos** los campos aunque no hayan cambiado: los de crear más `tarifaLimpieza` (obligatoria, mayor o igual a 0, máximo 2 decimales) y `reglas` (opcional, máximo 2000 caracteres). Se envían como números JSON con punto decimal, nunca `idAnfitrion`, `estado` ni `politica`. `barrioZona` y `reglas` vacíos viajan como `null`.

El estado decide si se puede editar: **BORRADOR y PAUSADA** sí; **ACTIVA**, **PENDIENTE_REVISION** y **BLOQUEADA** abren el formulario en solo lectura con su aviso.

| Respuesta | Qué hace el frontend |
|---|---|
| `200` | "Cambios guardados" y vuelve al listado "Mis publicaciones" |
| `400` con `errores` | Cada mensaje bajo su campo; no borra lo escrito (si no trae `errores`, el mensaje va arriba del formulario) |
| `403` | "No puedes editar esta publicación" y vuelve al listado (sin el aviso global de "Sin permisos") |
| `404` | "La publicación no existe" y vuelve al listado |
| `409` | Muestra el `mensaje` y pasa el formulario a solo lectura (el estado cambió mientras estaba abierto) |
| `401` | Lo resuelve el interceptor (cierra sesión y lleva al login) |

Cancelar o salir con cambios sin guardar pide confirmación. El botón "Editar" de la ficha solo está activo en BORRADOR o PAUSADA; en los demás estados explica el motivo con un tooltip. Desde HU-010 el punto de entrada habitual es el listado "Mis publicaciones"; la ficha que aparece al crear también lleva a la edición.

### Consultar mis publicaciones (HU-010)

| Método y ruta | Acceso | Uso |
|---|---|---|
| `GET /publicaciones/mias?pagina=0&tamano=10` | Solo ANFITRION | Página de las publicaciones del Anfitrión autenticado |

El frontend envía siempre `tamano=10`; `pagina` empieza en 0. La respuesta es `{ contenido: [{ idPublicacion, titulo, estado, ciudad, tipo, capacidad, precioNoche }], pagina, tamano, totalElementos, totalPaginas, mensaje }`. El backend ya devuelve **solo** las del Anfitrión de la sesión y las ordena de la más reciente a la más antigua, así que el frontend **no filtra ni reordena**.

- Cada tarjeta muestra el título, el tipo (con su icono), la ciudad, la capacidad, el precio en pesos y la etiqueta de color del estado vigente (Borrador, Pendiente de revisión, Activa, Pausada o Bloqueada). No hay imágenes: el resumen no trae URL.
- Cada tarjeta es un enlace al **detalle** (`/anfitrion/publicaciones/:id`, con `GET /publicaciones/{id}`): al tocar el título o cualquier parte de la tarjeta se abre la ficha de esa publicación, con un botón para volver al listado. Si la publicación es de otro Anfitrión (403) o no existe (404), avisa y vuelve al listado.
- "Editar" solo está activo en BORRADOR y PAUSADA; en los demás estados queda deshabilitado con un tooltip que explica el motivo.
- Sin publicaciones, el backend responde `contenido: []` y `mensaje: "No tiene publicaciones registradas"`; se muestra ese mensaje con un botón "Crear publicación", sin información de otros Anfitriones.
- La paginación ("Anterior", "Página X de Y", "Siguiente") se oculta si `totalPaginas` es 1 o menos.
- Un 400 (paginación inválida) o un fallo de red muestran un aviso con "Reintentar".

### Intervención administrativa de una publicación (HU-011)

| Método y ruta | Acceso | Uso |
|---|---|---|
| `GET /admin/publicaciones/{id}` | Solo ADMINISTRADOR | Cargar cualquier publicación (de cualquier Anfitrión) para precargar el formulario |
| `PUT /admin/publicaciones/{id}` | Solo ADMINISTRADOR | Guardar la intervención con su motivo |

El cuerpo del PUT es `{ "motivo": "...", "cambios": { ...mismos campos que la edición del Anfitrión... } }`. El **motivo es obligatorio, de 10 a 500 caracteres**, y el backend lo guarda en la auditoría junto con quién interviene (el Administrador del token) y cuándo. La intervención no cambia el estado ni el propietario.

El Administrador interviene en cualquier estado **salvo ACTIVA**: una activa debe pausarse antes, y el formulario queda en solo lectura con el mensaje del backend ("La publicación está activa: páusela antes de intervenirla"). En PENDIENTE_REVISION las reglas son obligatorias.

| Respuesta | Qué hace el frontend |
|---|---|
| `200` | "Intervención registrada" y vuelve al panel `/admin` |
| `400` con `errores` | Cada mensaje bajo su campo (las claves del backend vienen como `cambios.capacidad` y `motivo`); no borra lo escrito |
| `403` | Lleva a "Sin permisos" (la ruta está protegida con el guard de rol Administrador) |
| `404` | "La publicación no existe" y vuelve al panel |
| `409` | Muestra el mensaje y pasa el formulario a solo lectura |
| `401` | Lo resuelve el interceptor (cierra sesión y lleva al login) |

Se llega desde el detalle del Administrador (`/admin/publicaciones/:id`, enlace "Intervenir (editar)"). La pantalla `/admin/publicaciones/:id/editar` reutiliza el formulario de publicación en su modo `intervenir`, que añade el campo del motivo con su contador.

### Solicitar la activación de una publicación (HU-012)

`POST /publicaciones/{id}/enviar-revision`, solo rol ANFITRION, sin cuerpo. Pasa un borrador propio a PENDIENTE_REVISION para que el Administrador lo revise y lo active. Solo se envía un BORRADOR.

| Respuesta | Qué hace el frontend |
|---|---|
| `200` con la publicación (`estado: "PENDIENTE_REVISION"`) | Aviso "Publicación enviada a revisión" y recarga del listado (página actual) o del detalle |
| `400` con `errores` (`descripcion`, `direccionTextual`, `barrioZona`, `reglas`) | Panel con el mensaje de cada campo pendiente y el enlace "Completar publicación" a `/anfitrion/publicaciones/:id/editar`; la publicación no cambia |
| `403` (de otro Anfitrión) | Aviso con el mensaje; no se muestra el aviso global de permisos (`OMITIR_AVISO_403`) |
| `404` | Aviso "La publicación no existe" |
| `409` (no está en BORRADOR) | Aviso con el mensaje del backend (ya en revisión, activa, pausada o bloqueada) y recarga para refrescar el estado |

**Dónde está.** Botón "Enviar a revisión" en cada fila en BORRADOR de "Mis publicaciones" y en la ficha de detalle de un borrador. Las publicaciones en PENDIENTE_REVISION muestran "En revisión del Administrador". Antes de enviar se pide confirmación ("¿Enviar la publicación a revisión? El Administrador la revisará antes de activarla."), y mientras envía el botón queda deshabilitado con indicador de carga.

**Información mínima.** La creación no pide las reglas, así que normalmente el Anfitrión tendrá que completarlas editando antes de enviar. El frontend no repite la regla: decide el backend y el panel muestra lo que este responde.

El caso de uso es `SolicitarActivacionFacade`, que cada página provee y escucha (`resultado$`). `TransicionNoPermitidaError` (409) queda disponible para las demás acciones del ciclo de vida.

### Revisar una publicación pendiente (HU-013)

Tres endpoints bajo `/admin/publicaciones`, solo rol ADMINISTRADOR. La bandeja está en `/admin/publicaciones/pendientes` (acceso desde el panel `/admin`).

| Método y ruta | Uso |
|---|---|
| `GET /admin/publicaciones/pendientes?pagina=&tamano=` | Publicaciones en PENDIENTE_REVISION, completas, de la más antigua a la más reciente (`tamano` de 1 a 100; la bandeja pide 10) |
| `POST /admin/publicaciones/{id}/aprobar` | Sin cuerpo; pasa la publicación a ACTIVA |
| `POST /admin/publicaciones/{id}/rechazar` | `{ "motivo": "..." }` (de 10 a 500 caracteres, recortado); devuelve la publicación a BORRADOR para que el Anfitrión la corrija |

| Respuesta | Qué hace el frontend |
|---|---|
| Lista `200` | Una tarjeta por publicación con la información completa (título, descripción, dirección, barrio, ciudad, tipo, política, capacidad, precios, reglas y «Anfitrión #id»), paginación y, sin pendientes, el `mensaje` de la API ("No hay publicaciones pendientes de revisión") |
| Aprobar `200` | Aviso "Publicación aprobada" y recarga: la saca de la bandeja |
| Aprobar `400` con `errores` (`descripcion`, `direccionTextual`, `barrioZona`, `reglas`) | Muestra el mensaje y los campos pendientes dentro de la tarjeta, con un enlace "Intervenir publicación"; la publicación sigue pendiente |
| Rechazar `200` | Aviso "Publicación rechazada", cierra el cuadro y recarga |
| Rechazar `400` con `errores.motivo` | El mensaje queda dentro del cuadro, que sigue abierto |
| `404` o `409` (ya no está en PENDIENTE_REVISION) | Aviso con el mensaje del backend y recarga para refrescar la bandeja |

Aprobar pide confirmación. Rechazar abre el cuadro del motivo (`app-modal-motivo`), un componente reutilizable de `shared/ui` basado en el `<dialog>` nativo: Escape cancela, el foco va al campo de texto al abrir y valida de 10 a 500 caracteres del texto recortado (`longitudEntre`) con contador. Lo reusará el bloqueo de publicaciones (HU-015).

`accionesAdministrador(estado)` decide qué botones muestra cada tarjeta: Aprobar y Rechazar en PENDIENTE_REVISION y ninguno en los demás estados. Un rol distinto de Administrador no entra a la bandeja (`rolGuard`).

### Pausar una publicación activa (HU-014)

`POST /publicaciones/{id}/pausar`, solo rol ANFITRION, sin cuerpo. Pasa una publicación ACTIVA propia a PAUSADA: deja de aparecer en las búsquedas, conserva su información y se puede editar mientras está pausada (el Administrador la revisa para reactivarla).

| Respuesta | Qué hace el frontend |
|---|---|
| `200` con la publicación (`estado: "PAUSADA"`) | Aviso "Publicación pausada" y recarga del listado (página actual) o del detalle |
| `403` (de otro Anfitrión) | Aviso con el mensaje; no se muestra el aviso global de permisos (`OMITIR_AVISO_403`) |
| `404` | Aviso "La publicación no existe" |
| `409` (no está ACTIVA) | Aviso con el mensaje del backend (por ejemplo "La publicación ya está pausada") y recarga para refrescar el estado |

**Dónde está.** Botón "Pausar" en cada fila ACTIVA de "Mis publicaciones" y en la ficha de detalle de una publicación activa; las PAUSADA muestran "El Administrador revisará tus ajustes antes de reactivarla" y tienen "Editar" activo. Antes de pausar se pide confirmación ("¿Pausar la publicación? Dejará de aparecer en las búsquedas. Podrás editarla mientras esté pausada y el Administrador la revisará para reactivarla."). El texto de una activa en la edición pasó a "Esta publicación está activa. Para editarla, páusala primero.", porque ahora es el propio Anfitrión quien pausa.

### Alojamientos disponibles (HU-014)

`GET /alojamientos?pagina=&tamano=`, **público**: el frontend no envía `Authorization` ni cierra la sesión por un 401 (`/alojamientos` está en `RUTAS_PUBLICAS` del interceptor). Devuelve solo publicaciones ACTIVAS, de la más reciente a la más antigua, con el mismo resumen de "Mis publicaciones" (`idPublicacion`, `titulo`, `estado`, `ciudad`, `tipo`, `capacidad`, `precioNoche`); `tamano` de 1 a 100 y, sin ninguna, `mensaje: "No hay alojamientos disponibles por el momento"`. No hay detalle público por id y el resumen no trae dirección ni datos del Anfitrión.

- **Feature `features/alojamientos`** con las mismas capas: `AlojamientoRepository.listar(pagina, tamano)`, su implementación HTTP, `AlojamientosFacade` y `alojamientos-page` (tarjetas con título, ciudad, tipo, capacidad y precio por noche; paginación; estado vacío con el `mensaje` de la API; sin acciones de gestión).
- **Paginación compartida.** `ListadoPaginado<T>` concentra los estados (cargando, listo, error, vacía) y la navegación entre páginas; la usan `MisPublicacionesFacade` y `AlojamientosFacade`.
- **Rutas.** `/alojamientos` es pública (sin guard) y `/marketplace` (Huésped) muestra la misma página con el mismo repositorio, sin duplicar código. La portada tiene el enlace "Ver alojamientos".

### Bloquear y reactivar publicaciones (HU-015)

**Cambio en la publicación.** `PublicacionResponseDto` trae `motivoBloqueo` (texto o `null`; solo tiene valor si está BLOQUEADA) en `GET /publicaciones/{id}`, en `GET /admin/publicaciones/{id}` y en los listados del Administrador. El modelo `Publicacion` lo expone como `motivoBloqueo: string | null` (si el backend no lo manda, queda en `null`).

Rol ADMINISTRADOR, bajo `/admin/publicaciones`:

| Método y ruta | Uso |
|---|---|
| `GET ?estado=&pagina=&tamano=` | Todas las publicaciones, completas, de la más reciente a la más antigua. `estado` es opcional (`BORRADOR`, `PENDIENTE_REVISION`, `ACTIVA`, `PAUSADA`, `BLOQUEADA`, en mayúsculas); sin él trae todas. `tamano` de 1 a 100 (la gestión pide 10). Vacío: `mensaje: "No hay publicaciones para mostrar"` |
| `POST /{id}/bloquear` | `{ "motivo": "..." }` (de 10 a 500 caracteres, recortado). La publicación queda BLOQUEADA con `motivoBloqueo` |
| `POST /{id}/reactivar` | `{ "motivo": "..." }`. La publicación queda ACTIVA y `motivoBloqueo` vuelve a `null` |

| Respuesta | Qué hace el frontend |
|---|---|
| Bloquear o reactivar `200` | Aviso ("Publicación bloqueada" o "Publicación reactivada"), cierra el cuadro del motivo y recarga la pestaña |
| `400` con `errores.motivo` | El mensaje queda dentro del cuadro del motivo, que sigue abierto |
| Reactivar `400` por falta de información mínima (`descripcion`, `direccionTextual`, `barrioZona`, `reglas`) | Cierra el cuadro y muestra el mensaje y los campos pendientes en la fila, con un enlace "Intervenir publicación"; la publicación no cambia ni sale de la lista |
| `404` o `409` (borrador, ya bloqueada, no está PAUSADA ni BLOQUEADA…) | Aviso con el mensaje del backend y recarga para refrescar el estado |

**Acciones por estado** (`accionesAdministrador`): PENDIENTE_REVISION → aprobar, rechazar y bloquear; ACTIVA → bloquear; PAUSADA → reactivar y bloquear; BLOQUEADA → reactivar; BORRADOR → ninguna.

**Gestión de publicaciones** (`/admin/publicaciones`). Pestañas Pendientes, Activas, Pausadas, Bloqueadas y Todas, con paginación de 10 y estado vacío con el `mensaje` de la API. Pendientes usa `GET /pendientes`; Activas, Pausadas, Bloqueadas y Todas usan `GET ?estado=` (Todas, sin `estado`). Cada fila muestra título, «Anfitrión #id», ciudad, tipo, precio, estado y, si está bloqueada, el motivo del bloqueo destacado; en Pendientes se usa la tarjeta completa de la bandeja de HU-013. Al reactivar una bloqueada, el cuadro del motivo muestra el motivo del bloqueo para decidir con esa información.

**Detalle del Administrador** (`/admin/publicaciones/:id`, después de `pendientes`). Información completa con `GET /admin/publicaciones/{id}`, el motivo del bloqueo destacado y los mismos botones. Con un 404 avisa "La publicación no existe" y vuelve a la gestión. Cuando el estado no es ACTIVA ofrece "Intervenir (editar)", que lleva a `/admin/publicaciones/:id/editar` (esa ruta se conserva).

**Panel `/admin`.** Reemplaza el buscador por número por los accesos a la gestión de publicaciones y a la bandeja de pendientes.

**Anfitrión.** La ficha de detalle de una publicación bloqueada muestra un recuadro con el motivo del bloqueo, y las filas BLOQUEADA de "Mis publicaciones" tienen el enlace "Ver motivo" al detalle.

**Listado público.** Si la sesión es de Administrador, cada tarjeta de `/alojamientos` muestra «Gestionar», que lleva a `/admin/publicaciones/:id`. Una publicación bloqueada no aparece en ese listado.

La decisión sobre una publicación (aprobar, rechazar, bloquear, reactivar) la concentra `DecisionesPublicacionFacade`, que comparten la gestión y el detalle. El cuadro del motivo es el componente reutilizable `app-modal-motivo`.

### Errores y sesión

Todos los endpoints devuelven `{ fecha, estado, error, mensaje, ruta, errores? }`. `401` en una ruta protegida: cierra la sesión y lleva a `/login?expirada=true`. `403`: aviso "Sin permisos" con el `mensaje`, sin cerrar la sesión. Un temporizador cierra la sesión sola al vencer el token (60 minutos, sin renovación).

### Trazabilidad

El registro oficial de auditoría (tabla `evento_auditoria`) lo escribe el backend en la misma transacción que la acción. El frontend solo agrega el `X-Correlation-Id` y envía eventos de negocio a `POST /events` cuando `tracking.remote` está activo.

## Pruebas y calidad

- **Pruebas unitarias** con Karma y Jasmine: 1084 pruebas en 84 archivos. Cada capa se prueba aislada: validadores y mappers (funciones puras), repositorio HTTP con `HttpTestingController`, facades con repositorios falsos, guards, interceptores y componentes sobre su DOM.
- **Pruebas unitarias** con Karma y Jasmine: 194 pruebas en 23 archivos. Cada capa se prueba aislada: validadores y mappers (funciones puras), repositorio HTTP con `HttpTestingController`, facades con repositorios falsos, guards, interceptores y componentes sobre su DOM.
- **Pruebas unitarias** con Karma y Jasmine: 599 pruebas en 51 archivos. Cada capa se prueba aislada: validadores y mappers (funciones puras), repositorio HTTP con `HttpTestingController`, facades con repositorios falsos, guards, interceptores y componentes sobre su DOM.
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
