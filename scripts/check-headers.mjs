#!/usr/bin/env node
/**
 * Verificador de headers de seguridad y caché.
 *
 * Uso:
 *   node scripts/check-headers.mjs https://TU-PROYECTO.web.app
 *   node scripts/check-headers.mjs http://localhost:5000        (emulador)
 *
 * Revisa el HTML de la home y un asset estático de /_next/static/ y muestra
 * qué headers están presentes, con qué valor, y cuáles faltan.
 * Sale con código 1 si falta algún header obligatorio (sirve para usarlo en CI).
 */

const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!base) {
  console.error("Uso: node scripts/check-headers.mjs <URL base>");
  process.exit(2);
}

const OBLIGATORIOS_HTML = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
];

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

async function headersDe(url) {
  const res = await fetch(url, { redirect: "manual" });
  return { status: res.status, headers: res.headers, body: await res.text() };
}

let faltantes = 0;

console.log(`\n▶ HTML: ${base}/`);
const home = await headersDe(`${base}/`);
console.log(gris(`  status ${home.status}`));
for (const h of OBLIGATORIOS_HTML) {
  const v = home.headers.get(h);
  if (v) console.log(`  ${verde("✔")} ${h}: ${gris(v.length > 110 ? v.slice(0, 110) + "…" : v)}`);
  else {
    console.log(`  ${rojo("✘")} ${h} ${rojo("(falta)")}`);
    faltantes++;
  }
}
console.log(`  · cache-control: ${home.headers.get("cache-control") ?? rojo("(no definido)")}`);

const asset = home.body.match(/\/_next\/static\/[^"']+\.js/)?.[0];
if (asset) {
  console.log(`\n▶ Asset estático: ${asset}`);
  const a = await headersDe(`${base}${asset}`);
  const cc = a.headers.get("cache-control") ?? "";
  const ok = cc.includes("immutable") && /max-age=\d{7,}/.test(cc);
  console.log(`  ${ok ? verde("✔") : rojo("✘")} cache-control: ${cc || rojo("(no definido)")}`);
  if (!ok) faltantes++;
} else {
  console.log(rojo("\n  No se encontró ningún asset /_next/static/*.js en el HTML."));
}

console.log(
  faltantes === 0
    ? verde("\n✅ Todos los controles pasaron.\n")
    : rojo(`\n❌ ${faltantes} control(es) pendiente(s).\n`),
);
process.exit(faltantes === 0 ? 0 : 1);
