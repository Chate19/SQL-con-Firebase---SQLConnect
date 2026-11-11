# Catálogo de Cursos · Prácticas de Programación Avanzada

Next.js (export estático) + **Firebase** en plan **Spark** (sin tarjeta de crédito).
El mismo repo evoluciona clase a clase:

| Clase | Tema | Estado de este repo |
|---|---|---|
| 1 | CI/CD con Firebase Hosting, preview channels y headers de seguridad | ✅ resuelta (incluida) |
| 2 · lunes | **SQL Connect**: PostgreSQL detrás de una API con autorización | ⬅️ **punto de partida** |
| 3 · viernes | Analytics: plan de medición, consentimiento y SQL en BigQuery | próximamente |

> El enunciado, el cronograma y la rúbrica están en el documento de cada práctica.
> Este README es la guía técnica rápida.

---

## Arquitectura (clase 2)

```
 Navegador (Next.js estático)
   │  Firebase Auth (email/contraseña) ──────────▶ token con auth.uid y auth.token.email
   │
   │  executeQuery("ListCursos")  ┐
   │  executeMutation("Inscribirme", { cursoId })  ┘  solo NOMBRE + variables, nunca SQL
   ▼
 SQL Connect ── conector "cursos" (dataconnect/cursos/*.gql) ── @auth decide quién ejecuta qué
   ▼
 PostgreSQL (Cloud SQL, prueba sin costo 90 días)   ·   en desarrollo: emulador local (PGlite)
```

| Pieza | Rol |
|---|---|
| `dataconnect/schema/schema.gql` | Tablas: `Curso`, `Alumno` y **`Matricula` (la completás vos)** |
| `dataconnect/cursos/queries.gql` · `mutations.gql` | Operaciones expuestas a la app — **con TODOs** |
| `dataconnect/seed_data.gql` | Datos iniciales (cursos y dos alumnos ficticios) |
| `lib/firebase.ts` | Inicializa Firebase; en `npm run dev` usa los **emuladores** |
| `lib/sqlconnect.ts` | Llama a las operaciones por nombre (ya escrito) |
| `scripts/atacar.mjs` | Auditoría: se comporta como un atacante y prueba tus reglas `@auth` |

---

## Si venís de la clase 1 (tu propio repo)

1. Commiteá todo lo que tengas.
2. Copiá **sobre tu repo** el contenido de este, **excepto** `.github/`, `.firebaserc` y `firebase.json`
   (esos ya los tenés configurados con tu proyecto).
3. En **tu** `firebase.json`, agregá estas dos claves al mismo nivel que `"hosting"`:
   ```json
   "dataconnect": { "source": "dataconnect" },
   "emulators": {
     "auth": { "port": 9099 },
     "dataconnect": { "port": 9399, "dataDir": "dataconnect/.dataconnect/pgliteData" },
     "hosting": { "port": 5000 },
     "ui": { "enabled": true },
     "singleProjectMode": true
   }
   ```
4. `npm install`

## Preparación previa (antes del lunes, ~20 min)

1. Consola de Firebase → **Authentication** → *Comenzar* → *Sign-in method* → habilitá
   **Correo electrónico/contraseña**.
2. Consola → ⚙ *Configuración del proyecto* → *Tus apps* → si no hay una **app web**, creala
   (ícono `</>`). Copiá `apiKey`, `authDomain`, `projectId` y `appId` en `lib/firebase-config.ts`.
3. Verificá que los emuladores arrancan (la primera vez descargan el emulador de SQL Connect):
   ```bash
   npm run emulators
   ```
   Tiene que mostrar *All emulators ready* con Auth en 9099 y SQL Connect en 9399.
   La interfaz de los emuladores queda en <http://127.0.0.1:4000>.
4. En otra terminal: `npm run seed` y luego `npm run dev` → abrí <http://localhost:3000/cursos>:
   tienen que aparecer 7 cursos leídos desde PostgreSQL.

> **Recomendado:** instalá la extensión **Firebase** de VS Code. Valida los `.gql` mientras
> escribís (autocompleta campos como `alumnoId_expr`) y permite ejecutar operaciones contra el
> emulador con un click.

---

## Durante la clase · flujo de trabajo

Tres terminales:

```bash
npm run emulators     # 1 · Auth + SQL Connect locales
npm run dev           # 2 · la app en http://localhost:3000
npm run atacar        # 3 · auditoría de seguridad (repetila después de cada cambio)
```

| TODO | Dónde | Qué |
|---|---|---|
| L1 | `schema.gql` | Tabla `Matricula` (muchos-a-muchos, clave compuesta, fecha del servidor) |
| L2 | `mutations.gql` | `Inscribirme($cursoId)` · solo usuarios, idempotente, sin elegir alumno |
| L3 | `queries.gql` | `MisInscripciones` · solo las del usuario que llama |
| L4 | `queries.gql` | Auditar y corregir `ListAlumnos` |
| L5 *(opcional)* | `mutations.gql` | `DarmeDeBaja($cursoId)` |
| L6 | `firebase.json` | CSP: permitir que la app de producción hable con Auth y SQL Connect |
| L7 | consola | Deploy de SQL Connect a producción (prueba sin costo) |

Después de editar un `.gql`, mirá la terminal de los emuladores: ahí aparecen los errores de
compilación del esquema. Si no toma los cambios, reiniciá `npm run emulators`. Si cambiaste el
esquema y se queja de datos viejos, borrá `dataconnect/.dataconnect/` y volvé a correr `npm run seed`.

### Deploy a producción (L7)

```bash
npx firebase deploy --only dataconnect     # la 1.ª vez crea la instancia Cloud SQL de prueba
npx firebase dataconnect:execute dataconnect/seed_data.gql   # datos iniciales en producción
```

La creación de la instancia tarda varios minutos; mientras tanto SQL Connect guarda los
datos en una base temporal y los migra al terminar. Después, el frontend se publica como
siempre: **por Pull Request** (tu pipeline de la clase 1).

---

## Comandos

| Comando | Para qué |
|---|---|
| `npm run emulators` | Emuladores de Auth y SQL Connect (+ UI en :4000) |
| `npm run seed` | Carga `seed_data.gql` en el emulador (privilegios de admin) |
| `npm run atacar` | Auditoría de seguridad de las operaciones contra el emulador |
| `npm run dev` | App en modo desarrollo, conectada a los emuladores |
| `npm run build` · `npm run serve` | Build de producción + emulador de Hosting con headers |
| `node scripts/check-headers.mjs <URL>` | Verifica headers de seguridad y caché |
| `npx firebase dataconnect:sql:diff` | Diferencias entre tu esquema y la base de producción |

## Problemas frecuentes

- **"No hay conexión con los emuladores"**: falta `npm run emulators` en otra terminal.
- **El catálogo dice que no puede cargar** en `npm run dev`: emuladores apagados o falta `npm run seed`.
- **`operation not found` / `Inscribirme` no existe**: la operación todavía no está escrita, o el `.gql` tiene un error (mirá la terminal de los emuladores).
- **`unauthenticated` al inscribirse**: no hay sesión iniciada (o la operación es `USER` y llamás sin login: ¡eso es lo correcto!).
- **En producción el catálogo no carga y la consola dice `Refused to connect`**: falta L6 (CSP `connect-src`).
- **Push de workflows rechazado** (*without workflow scope*): ver la preparación de la clase 1.
