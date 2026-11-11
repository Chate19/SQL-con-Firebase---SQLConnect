#!/usr/bin/env node
/**
 * Auditoría de seguridad de las operaciones de SQL Connect, contra los EMULADORES locales.
 *
 * Uso (con `npm run emulators` corriendo y `npm run seed` ejecutado):
 *   npm run atacar
 *
 * Se comporta como un atacante que tiene la configuración pública de tu app
 * (la misma que viaja en el bundle) y llama a tus operaciones directamente,
 * sin pasar por la interfaz. Cada control termina en ✔ (protegido), ✘ (vulnerable)
 * o … (pendiente: la operación todavía no existe).
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectDataConnectEmulator, executeMutation, executeQuery, getDataConnect, mutationRef, queryRef } from "firebase/data-connect";

const PROJECT_ID = process.env.GCLOUD_PROJECT || leerProjectId();
const conector = { location: "us-east4", service: "catalogo", connector: "cursos" };
const CURSO = "0b7c1a2e-0001-4c3a-9d5e-000000000003"; // "Seguridad en aplicaciones web" (seed)

// SQL Connect puede devolver los UUID sin guiones (p. ej. el emulador). Se comparan normalizados.
const mismoUuid = (a, b) => String(a ?? "").replace(/-/g, "").toLowerCase() === String(b ?? "").replace(/-/g, "").toLowerCase();

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const amarillo = (s) => `\x1b[33m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

function leerProjectId() {
  try {
    const rc = JSON.parse(readFileSync(".firebaserc", "utf8"));
    return rc.projects?.default;
  } catch {
    return "demo-catalogo";
  }
}

let n = 0;
function cliente(nombre) {
  const app = initializeApp({ apiKey: "fake-api-key", projectId: PROJECT_ID, appId: "1:1:web:1" }, `${nombre}-${n++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const dc = getDataConnect(app, conector);
  connectDataConnectEmulator(dc, "127.0.0.1", 9399);
  return { auth, dc };
}

async function intentar(fn) {
  try {
    return { ok: true, valor: await fn() };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

const noExiste = (msg) => /not found|no such|unknown operation|operation.*not|does not exist|NOT_FOUND/i.test(msg);

const resultados = [];
function reportar(estado, titulo, detalle) {
  resultados.push(estado);
  const icono = estado === "ok" ? verde("✔") : estado === "vuln" ? rojo("✘") : amarillo("…");
  console.log(`${icono} ${titulo}`);
  if (detalle) console.log(gris(`    ${detalle}`));
}

console.log(`\nAuditoría de SQL Connect · proyecto ${PROJECT_ID} · emuladores locales\n`);

// 1. El catálogo es público a propósito.
const anon = cliente("anonimo");
{
  const r = await intentar(() => executeQuery(queryRef(anon.dc, "ListCursos")));
  if (r.ok) reportar("ok", `ListCursos responde sin login (${r.valor.data.cursos.length} cursos) — público por diseño`);
  else {
    console.log(rojo("✘ No hay conexión con los emuladores."), gris(r.error));
    console.log("  Levantalos en otra terminal con `npm run emulators` y cargá los datos con `npm run seed`.\n");
    process.exit(2);
  }
}

// 2. Datos personales sin autenticación.
{
  const r = await intentar(() => executeQuery(queryRef(anon.dc, "ListAlumnos")));
  if (r.ok && r.valor.data.alumnos?.length)
    reportar("vuln", "ListAlumnos devuelve datos personales SIN login", `Ejemplo filtrado: ${JSON.stringify(r.valor.data.alumnos[0])}`);
  else if (r.ok) reportar("vuln", "ListAlumnos se puede ejecutar sin login (hoy vacía, pero expuesta)");
  else reportar("ok", "ListAlumnos rechazada para un cliente", r.error.slice(0, 140));
}

// 3. Inscribirse sin estar autenticado.
{
  const r = await intentar(() => executeMutation(mutationRef(anon.dc, "Inscribirme", { cursoId: CURSO })));
  if (r.ok) reportar("vuln", "Inscribirme funciona SIN login");
  else if (noExiste(r.error)) reportar("pend", "Inscribirme todavía no existe (TODO L2)", r.error.slice(0, 140));
  else reportar("ok", "Inscribirme rechazada sin login", r.error.slice(0, 140));
}

// 4. Aislamiento entre usuarios: A se inscribe, B no debe ver ni borrar lo de A.
const a = cliente("alumnoA");
const b = cliente("alumnoB");
const sufijo = Date.now();
try {
  await createUserWithEmailAndPassword(a.auth, `a${sufijo}@atacante.test`, "secreto123");
  await createUserWithEmailAndPassword(b.auth, `b${sufijo}@atacante.test`, "secreto123");
} catch (e) {
  console.log(rojo("✘ No se pudieron crear usuarios en el emulador de Auth (¿está corriendo en el puerto 9099?)"), gris(String(e?.message ?? e)));
  process.exit(2);
}
await intentar(() => executeMutation(mutationRef(a.dc, "UpsertAlumno", { nombre: "Alumno A" })));
await intentar(() => executeMutation(mutationRef(b.dc, "UpsertAlumno", { nombre: "Alumno B" })));

const insA = await intentar(() => executeMutation(mutationRef(a.dc, "Inscribirme", { cursoId: CURSO })));
if (!insA.ok) {
  reportar("pend", "No se pudo inscribir al usuario A: no se pueden probar los controles de aislamiento", insA.error.slice(0, 140));
} else {
  // 4a. Idempotencia
  const otraVez = await intentar(() => executeMutation(mutationRef(a.dc, "Inscribirme", { cursoId: CURSO })));
  if (otraVez.ok) reportar("ok", "Inscribirme es idempotente (repetir no falla)");
  else reportar("vuln", "Inscribirme falla si se repite (¿insert en lugar de upsert?)", otraVez.error.slice(0, 140));

  // 4b. B no ve las inscripciones de A
  const verB = await intentar(() => executeQuery(queryRef(b.dc, "MisInscripciones")));
  if (!verB.ok && noExiste(verB.error)) reportar("pend", "MisInscripciones todavía no existe (TODO L3)", verB.error.slice(0, 140));
  else if (!verB.ok) reportar("vuln", "MisInscripciones falla para un usuario autenticado", verB.error.slice(0, 140));
  else {
    const deB = verB.valor.data.alumno?.matriculas ?? [];
    if (deB.some((m) => mismoUuid(m.curso?.id, CURSO))) reportar("vuln", "El usuario B ve la inscripción del usuario A");
    else reportar("ok", "MisInscripciones solo devuelve lo del usuario que llama");
  }

  // 4c. B intenta dar de baja a A
  const bajaB = await intentar(() => executeMutation(mutationRef(b.dc, "DarmeDeBaja", { cursoId: CURSO })));
  const verA = await intentar(() => executeQuery(queryRef(a.dc, "MisInscripciones")));
  if (!bajaB.ok && noExiste(bajaB.error)) reportar("pend", "DarmeDeBaja todavía no existe (TODO L5, opcional)");
  else if (verA.ok) {
    const sigue = (verA.valor.data.alumno?.matriculas ?? []).some((m) => mismoUuid(m.curso?.id, CURSO));
    if (sigue) reportar("ok", "B no puede dar de baja a A");
    else reportar("vuln", "B logró borrar la inscripción de A");
  }
}

const vuln = resultados.filter((r) => r === "vuln").length;
const pend = resultados.filter((r) => r === "pend").length;
console.log(
  vuln
    ? rojo(`\n❌ ${vuln} vulnerabilidad(es) · ${pend} pendiente(s)\n`)
    : pend
      ? amarillo(`\n… Sin vulnerabilidades detectadas, ${pend} control(es) pendiente(s)\n`)
      : verde("\n✅ Todos los controles pasaron\n"),
);
process.exit(vuln ? 1 : 0);
