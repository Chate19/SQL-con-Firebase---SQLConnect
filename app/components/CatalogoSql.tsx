"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Curso } from "@/lib/cursos";
import { inscribirme, listarCursos, mensajeDeError } from "@/lib/sqlconnect";
import { useUsuario } from "@/lib/useUsuario";
import FiltroCursos from "./FiltroCursos";

type Estado = { tipo: "cargando" } | { tipo: "error"; mensaje: string } | { tipo: "ok"; cursos: Curso[] };

export default function CatalogoSql() {
  const usuario = useUsuario();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [aviso, setAviso] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  useEffect(() => {
    listarCursos()
      .then((cursos) => setEstado({ tipo: "ok", cursos }))
      .catch((e) => setEstado({ tipo: "error", mensaje: mensajeDeError(e) }));
  }, []);

  async function onInscribirme(curso: Curso) {
    setEnCurso(curso.id);
    setAviso(null);
    try {
      await inscribirme(curso.id);
      setAviso(`✔ Quedaste inscripto/a en "${curso.titulo}".`);
    } catch (e) {
      setAviso(`✘ No se pudo inscribir: ${mensajeDeError(e)}`);
    } finally {
      setEnCurso(null);
    }
  }

  if (estado.tipo === "cargando") return <p className="hint">Cargando cursos desde la base de datos…</p>;
  if (estado.tipo === "error")
    return (
      <p className="alerta alerta--error" role="alert">
        No se pudo cargar el catálogo: {estado.mensaje}
        <br />
        ¿Están corriendo los emuladores (<code>npm run emulators</code>) y cargaste los datos (<code>npm run seed</code>)?
      </p>
    );

  return (
    <>
      {aviso && (
        <p className={aviso.startsWith("✔") ? "alerta alerta--ok" : "alerta alerta--error"} role="status">
          {aviso} {aviso.startsWith("✔") && <Link href="/mis-inscripciones">Ver mis inscripciones →</Link>}
        </p>
      )}
      <FiltroCursos
        cursos={estado.cursos}
        accion={(c) =>
          usuario ? (
            <button type="button" className="button button--small" disabled={enCurso === c.id} onClick={() => onInscribirme(c)}>
              {enCurso === c.id ? "Inscribiendo…" : "Inscribirme"}
            </button>
          ) : (
            <small className="hint">Ingresá para inscribirte</small>
          )
        }
      />
    </>
  );
}
