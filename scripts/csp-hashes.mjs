#!/usr/bin/env node
/**
 * Desafío extra (nivel destacado): CSP sin 'unsafe-inline' para un export estático de Next.js.
 *
 * Problema: el export estático de Next inyecta <script> inline (bootstrap de Turbopack y el
 * payload RSC `self.__next_f.push(...)`). Con `script-src 'self'` esos scripts se bloquean y
 * la app no hidrata (el filtro de /cursos deja de responder). Como no hay servidor, no se
 * puede usar un nonce por request.
 *
 * Solución: después de `next build`, calcular el SHA-256 de cada script inline de todos los
 * HTML de `out/` y reemplazar el marcador __INLINE_SCRIPT_HASHES__ de firebase.json por la
 * lista de hashes ('sha256-...'). Se ejecuta en el pipeline, entre el build y el deploy.
 *
 * Uso:  node scripts/csp-hashes.mjs [carpeta-out] [firebase.json]
 * Nota: modifica firebase.json IN PLACE. En CI no importa (copia efímera). En local,
 *       restaurá con `git checkout firebase.json` antes de commitear.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = process.argv[2] ?? "out";
const FIREBASE_JSON = process.argv[3] ?? "firebase.json";
const MARCADOR = "__INLINE_SCRIPT_HASHES__";

function* htmlFiles(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* htmlFiles(ruta);
    else if (nombre.endsWith(".html")) yield ruta;
  }
}

// <script> sin atributo src: capturamos el contenido exacto entre las etiquetas.
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

const hashes = new Set();
let archivos = 0;
for (const archivo of htmlFiles(OUT_DIR)) {
  archivos++;
  const html = readFileSync(archivo, "utf8");
  for (const [, contenido] of html.matchAll(INLINE_SCRIPT)) {
    if (!contenido) continue;
    const digest = createHash("sha256").update(contenido, "utf8").digest("base64");
    hashes.add(`'sha256-${digest}'`);
  }
}

const config = readFileSync(FIREBASE_JSON, "utf8");
if (!config.includes(MARCADOR)) {
  console.error(`✘ No encontré ${MARCADOR} en ${FIREBASE_JSON}. ¿Ya se ejecutó el script?`);
  process.exit(1);
}

writeFileSync(FIREBASE_JSON, config.replaceAll(MARCADOR, [...hashes].join(" ")));
console.log(`✔ ${hashes.size} hashes de ${archivos} archivos HTML insertados en ${FIREBASE_JSON}`);
