"use client";

import { useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { firebase, USA_EMULADORES } from "@/lib/firebase";
import { mensajeDeError, registrarAlumno } from "@/lib/sqlconnect";
import { useUsuario } from "@/lib/useUsuario";

export default function AuthPanel() {
  const usuario = useUsuario();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<"ingresar" | "registrarme">("ingresar");
  const [error, setError] = useState<string | null>(null);

  if (usuario === undefined) return <span className="auth auth--cargando">…</span>;

  if (usuario) {
    return (
      <span className="auth">
        <span className="auth__nombre">{usuario.displayName ?? usuario.email}</span>
        <button type="button" className="link" onClick={() => signOut(firebase().auth)}>
          Salir
        </button>
      </span>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const nombre = String(f.get("nombre") ?? "").trim();
    const { auth } = firebase();
    try {
      if (modo === "registrarme") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: nombre });
        await cred.user.getIdToken(true); // token nuevo con el email incluido
        await registrarAlumno(nombre); // crea la fila en la tabla Alumno
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setAbierto(false);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  return (
    <span className="auth">
      <button type="button" className="link" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
        Ingresar
      </button>
      {abierto && (
        <form className="auth__form" onSubmit={onSubmit}>
          <div className="chips" role="group">
            <button type="button" className={modo === "ingresar" ? "chip chip--activo" : "chip"} onClick={() => setModo("ingresar")}>
              Ingresar
            </button>
            <button type="button" className={modo === "registrarme" ? "chip chip--activo" : "chip"} onClick={() => setModo("registrarme")}>
              Crear cuenta
            </button>
          </div>
          {modo === "registrarme" && <input name="nombre" placeholder="Tu nombre" required maxLength={80} autoComplete="name" />}
          <input name="email" type="email" placeholder="Email" required autoComplete="email" />
          <input name="password" type="password" placeholder="Contraseña (mín. 6)" required minLength={6} autoComplete={modo === "registrarme" ? "new-password" : "current-password"} />
          <button type="submit" className="button button--small">
            {modo === "registrarme" ? "Crear cuenta" : "Ingresar"}
          </button>
          {USA_EMULADORES && <small className="hint">Emulador de Auth: cualquier email sirve.</small>}
          {error && <small className="alerta alerta--error">{error}</small>}
        </form>
      )}
    </span>
  );
}
