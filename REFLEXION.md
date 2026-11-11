# Reflexión · Clase 2 (lunes) · SQL Connect

Práctica resuelta sobre el repo `clase-2-lunes`. Las decisiones de modelado y de
autorización están comentadas en `dataconnect/`; acá van las respuestas y la
evidencia de la auditoría.

---

## 1. ¿Por qué ninguna operación recibe el id del alumno como variable? ¿Qué es IDOR y cómo lo evita `auth.uid`?

Porque el id del alumno **no es un dato que el cliente deba elegir**: es la
identidad de quien llama. Si `Inscribirme` o `MisInscripciones` aceptaran
`$alumnoId`, cualquiera podría mandar el UID de otra persona y leer sus
inscripciones o inscribirlo sin permiso. Eso es **IDOR** (*Insecure Direct Object
Reference*, OWASP API1: Broken Object Level Authorization): la API recibe un
identificador de objeto y confía en que el cliente solo va a pedir los suyos.

`auth.uid` lo evita porque lo completa el **servidor** a partir del token de
Firebase Auth ya verificado:

```graphql
mutation Inscribirme($cursoId: UUID!) @auth(level: USER) {
  matricula_upsert(data: { alumnoId_expr: "auth.uid", cursoId: $cursoId })
}

query MisInscripciones @auth(level: USER) {
  alumno(key: { id_expr: "auth.uid" }) { ... }
}
```

La operación no tiene forma de apuntar a otro alumno: la única variable es el
curso. La autorización a nivel de objeto queda garantizada por la firma de la
operación, no por una validación que alguien podría olvidarse de escribir.

## 2. `ListCursos` es PUBLIC y `ListAlumnos` quedó NO_ACCESS. ¿Qué criterio usaste? ¿Cómo haría el "panel de admin" para listar alumnos?

Criterio: **el dato mínimo necesario para la función pública y el nivel de
confianza que podemos verificar en el servidor**.

- `ListCursos` devuelve información del catálogo (título, nivel, horas, cupo).
  No identifica a nadie y es la razón de ser de la app: PUBLIC con
  `insecureReason` justificado.
- `ListAlumnos` devuelve `id`, `nombre` y `email` de **todas** las personas: dato
  personal y, además, identificador de autenticación (el UID). No hay un rol de
  administrador en Firebase Auth que el servidor pueda comprobar desde el
  cliente, así que cualquier nivel distinto de NO_ACCESS seguiría expuesto a
  cualquiera que copie la config pública del bundle. Se cierra.

El panel de admin no debe listar alumnos desde el navegador. Opciones correctas,
en orden de preferencia:

1. **Backend confiable**: una Cloud Function (Admin SDK) que valide un *custom
   claim* `admin: true` en el token y consulte con privilegios de servidor. El
   navegador llama a la función, nunca a la base.
2. **Herramienta de administración**: consola de Firebase / CLI / SQL Connect
   con credenciales de administrador (las mismas que usa `npm run seed`), fuera
   del bundle público.
3. Si la app necesitara que cada alumno vea *su* perfil, una operación
   `@auth(level: USER)` que filtre por `auth.uid` (como `MisInscripciones`).

## 3. ¿Qué ventaja tiene una clave primaria compuesta en `Matricula` frente a validar duplicados en el código del cliente?

La regla vive **una sola vez, en la base de datos**, y se aplica a *todas* las
escrituras, incluidas las que no pasan por la UI (el script de auditoría, un
atacante con la config pública, un futuro importador de datos). El índice único
sobre `(alumnoId, cursoId)` hace imposible la duplicación a nivel de PostgreSQL.

Validar en el cliente, en cambio:

- se puede saltear llamando la API directamente;
- tiene una condición de carrera (dos pestañas consultan "no existe" y ambas
  insertan);
- hay que repetirla en cada operación que escriba la tabla.

Además, la clave compuesta **es** la identidad de la inscripción: no hace falta
un UUID propio de `Matricula` que después habría que indexar y mantener. Para
`upsert` y `delete` por clave, el cliente solo aporta el `cursoId` y el servidor
completa el alumno con `auth.uid`.

*Extra (nivel destacado):* para el cupo no alcanza una restricción de columna,
porque depende del conteo de otra tabla. Se resolvería con un trigger/constraint
diferido o una transacción que cuente e inserte, y un índice sobre `cursoId` para
que ese conteo y el listado por curso sean eficientes.

## 4. La configuración de Firebase es pública. ¿Por qué eso no compromete la base de datos? ¿Qué capa faltaría contra alguien que usa esa config desde un script?

`apiKey`, `projectId`, `appId`, etc. **identifican el proyecto**, no autorizan:
son las coordenadas para hablar con los servicios. La seguridad real está en
otras capas:

1. **Firebase Auth** emite un token firmado; sin login no hay `auth.uid`.
2. **`@auth` de SQL Connect** decide, operación por operación, si se ejecuta y
   con qué identidad (PUBLIC / USER / NO_ACCESS).
3. Las operaciones usan valores del servidor (`auth.uid`, `auth.token.email`,
   `request.time`), no datos que el cliente pueda inventar.
4. La base no expone SQL arbitrario: solo se pueden invocar operaciones con
   nombre y variables tipadas.

Falta **App Check**: hoy nada impide que un script fuera de la app use la
`apiKey` pública para crear cuentas o llamar operaciones como si fuera un
usuario legítimo (respetando `@auth`, pero a escala). App Check con reCAPTCHA
Enterprise / App Attest / Play Integrity agrega atestación de que el pedido viene
de *tu* app, y se configura como requisito del servicio de SQL Connect. Es
defensa en profundidad: no reemplaza a `@auth`, lo complementa.

## 5. Comparado con una API REST propia (Express + `pg`), ¿qué te da SQL Connect y qué perdés?

**Gana:**

- **Inyección SQL cerrada por diseño**: el cliente no manda SQL; el servidor
  compila operaciones declaradas.
- **Autorización declarativa junto a la operación**: `@auth` está al lado de la
  query, versionada en el repo, y no dispersa en middlewares.
- **Esquema y migraciones gestionados** desde los `.gql` (con `sql:diff` para
  revisar el SQL).
- **Tipos y SDK generables**; menos código de plumbing (validación, conexión,
  serialización).
- **Valores del servidor** (`auth.uid`, `request.time`) sin escribir código.
- **Infraestructura gestionada**: Cloud SQL, escalado y respaldos a cargo de
  Firebase.

**Pierde:**

- **Control fino**: transacciones complejas, SQL analítico, triggers y
  extensiones de Postgres quedan limitados a lo que SQL Connect expone.
- **Portabilidad / lock-in**: el esquema y las operaciones son de Firebase; migrar
  a otra plataforma implica reescribir la capa de datos.
- **Depuración**: menos visibilidad del SQL generado y de los planes de consulta
  que con `pg` directo.
- **Lógica de negocio en el servidor**: no hay lugar para código arbitrario
  (aunque eso también es la ventaja de seguridad); para eso haría falta Cloud
  Functions.
- **Costo y límites**: fuera del plan/trial hay que presupuestar instancia y
  operaciones.

En resumen: SQL Connect cambia "escribir y asegurar una API" por "declarar
operaciones y su autorización". Se gana seguridad y velocidad; se pierde
flexibilidad.

## 6. ¿Por qué no alcanzó con la CSP de la clase 1 y por qué conviene listar dominios exactos en `connect-src`?

La CSP de la clase 1 tenía `connect-src 'self'`: la app solo podía hacer
peticiones a su propio origen. Con SQL Connect el navegador habla **directo** con
tres orígenes externos, y el navegador bloquea cualquiera que no esté listado
(`Refused to connect`):

| Origen | Para qué |
|---|---|
| `https://identitytoolkit.googleapis.com` | login / creación de cuenta (Auth) |
| `https://securetoken.googleapis.com` | renovación del token |
| `https://firebasedataconnect.googleapis.com` | ejecutar las operaciones de SQL Connect |

Se listan **exactos** y no `https://*.googleapis.com` porque el comodín abre la
política a *todos* los servicios de Google: si un XSS consigue ejecutar código,
puede exfiltrar datos a cualquier API de Google (o a un endpoint atacante alojado
allí) sin que la CSP lo frene. `connect-src` es la última barrera contra la
exfiltración; cuanto más chica la lista, menos superficie. Si mañana se suma App
Check, habrá que agregar solo el origen que use
(`https://firebaseinstallations.googleapis.com`), y nada más.

La política quedó así en `firebase.json` (los hashes de scripts inline los sigue
inyectando `scripts/csp-hashes.mjs` en el pipeline):

```
connect-src 'self'
  https://identitytoolkit.googleapis.com
  https://securetoken.googleapis.com
  https://firebasedataconnect.googleapis.com
```

Verificado con `npm run build` + `scripts/csp-hashes.mjs` + emulador de Hosting:
`node scripts/check-headers.mjs http://127.0.0.1:5000` → **todos los controles
pasaron**.

---

## Evidencia · `npm run atacar`

### Antes (punto de partida)

```
Auditoría de SQL Connect · proyecto demo-catalogo · emuladores locales

✔ ListCursos responde sin login (7 cursos) — público por diseño
✘ ListAlumnos devuelve datos personales SIN login
    Ejemplo filtrado: {"email":"ana@ejemplo.test","id":"seed-uid-ana","nombre":"Ana Ficticia"}
… Inscribirme todavía no existe (TODO L2)
    operation "Inscribirme" not found
… No se pudo inscribir al usuario A: no se pueden probar los controles de aislamiento
    operation "Inscribirme" not found

❌ 1 vulnerabilidad(es) · 2 pendiente(s)
```

### Después (L1–L5 implementados)

```
Auditoría de SQL Connect · proyecto demo-catalogo · emuladores locales

✔ ListCursos responde sin login (7 cursos) — público por diseño
✔ ListAlumnos rechazada para un cliente
    unauthorized: you are not authorized to perform this operation
✔ Inscribirme rechazada sin login
    unauthenticated: this operation requires a signed-in user
✔ Inscribirme es idempotente (repetir no falla)
✔ MisInscripciones solo devuelve lo del usuario que llama
✔ B no puede dar de baja a A

✅ Todos los controles pasaron
```

Nota: la auditoría se corrió contra los emuladores con el proyecto de prueba
`demo-catalogo` (`GCLOUD_PROJECT=demo-catalogo`), porque `.firebaserc` todavía
tiene el placeholder `REEMPLAZAR-POR-TU-PROJECT-ID`.

---

## Estado de los entregables

| # | Entregable | Estado |
|---|---|---|
| 1 | Repo con `dataconnect/` completo (L1–L5) | ✅ L1, L2, L3, L4 y L5 implementados y verificados con el emulador |
| 2 | Salida de `npm run atacar` antes/después | ✅ Arriba |
| 3 | PR con el cambio de CSP (L6) | ⏳ Cambio aplicado en `firebase.json`; falta commitear, pushear y abrir el PR en el repo del alumno |
| 4 | Producción con SQL Connect (L7) | ⏳ Pendiente: requiere el Project ID real y credenciales (`firebase login`) |
| 5 | Reflexión | ✅ Este archivo |

### L7 · comandos para completar el deploy

Con el proyecto real configurado en `.firebaserc` y `lib/firebase-config.ts`:

```bash
npx firebase login
npx firebase use TU-PROJECT-ID
npx firebase dataconnect:sql:diff            # revisar la migración ANTES de aplicar
npx firebase deploy --only dataconnect       # 1.ª vez: crea la instancia Cloud SQL (tarda varios minutos)
npx firebase dataconnect:execute dataconnect/seed_data.gql   # datos iniciales en producción
```

Después se publica el frontend como en la clase 1: rama → Pull Request →
preview → merge a `main`. No se ejecutó desde acá porque no hay credenciales ni
Project ID del alumno en este entorno.
