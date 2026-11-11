"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { darmeDeBaja, misInscripciones, mensajeDeError, type Inscripcion } from "@/lib/sqlconnect";
import { useUsuario } from "@/lib/useUsuario";

export default function MisInscripciones() {
  const usuario = useUsuario();
  const [items, setItems] = useState<Inscripcion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    misInscripciones()
      .then(setItems)
      .catch((e) => setError(mensajeDeError(e)));
  }, []);

  useEffect(() => {
    if (usuario) cargar();
  }, [usuario, cargar]);

  async function onBaja(cursoId: string) {
    try {
      await darmeDeBaja(cursoId);
      cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  if (usuario === undefined) return <p className="hint">Verificando sesión…</p>;
  if (usuario === null) return <p className="hint">Ingresá con tu cuenta (arriba a la derecha) para ver tus inscripciones.</p>;
  if (error)
    return (
      <p className="alerta alerta--error" role="alert">
        {error}
      </p>
    );
  if (items === null) return <p className="hint">Cargando…</p>;
  if (items.length === 0)
    return (
      <p className="hint">
        Todavía no te inscribiste a ningún curso. <Link href="/cursos">Ver cursos →</Link>
      </p>
    );

  return (
    <ul className="grilla">
      {items.map((i) => (
        <li key={i.curso.id} className="card">
          <span className={`badge badge--${i.curso.nivel}`}>{i.curso.nivel}</span>
          <h2>{i.curso.titulo}</h2>
          <small>
            {i.curso.horas} horas · inscripto/a el {new Date(i.fecha).toLocaleDateString("es-AR")}
          </small>
          <div className="card__accion">
            <button type="button" className="button button--small button--ghost" onClick={() => onBaja(i.curso.id)}>
              Darme de baja
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
