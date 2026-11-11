#!/usr/bin/env node
/**
 * Carga dataconnect/seed_data.gql en el EMULADOR de SQL Connect.
 * Multiplataforma (Windows/macOS/Linux): setea la variable de entorno y llama al CLI.
 *
 * Uso: npm run seed      (con `npm run emulators` corriendo en otra terminal)
 */
import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["firebase", "dataconnect:execute", "dataconnect/seed_data.gql"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, FIREBASE_DATA_CONNECT_EMULATOR_HOST: "127.0.0.1:9399" },
});
process.exit(r.status ?? 1);
