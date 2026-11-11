"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Curso, Nivel } from "@/lib/cursos";

const niveles: Array<Nivel | "todos"> = ["todos", "inicial", "intermedio", "avanzado"];

interface Props {
  cursos: Curso[];
  /** Contenido extra al pie de cada tarjeta (por ejemplo, el botón "Inscribirme"). */
  accion?: (curso: Curso) => ReactNode;
}

export default function FiltroCursos({ cursos, accion }: Props) {
  const [nivel, setNivel] = useState<Nivel | "todos">("todos");
  const [texto, setTexto] = useState("");

  const visibles = useMemo(
    () =>
      cursos.filter(
        (c) =>
          (nivel === "todos" || c.nivel === nivel) &&
          c.titulo.toLowerCase().includes(texto.trim().toLowerCase()),
      ),
    [cursos, nivel, texto],
  );

  return (
    <div>
      <div className="filtros" role="search">
        <input
          type="search"
          placeholder="Buscar por título…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Buscar curso por título"
        />
        <div className="chips" role="group" aria-label="Filtrar por nivel">
          {niveles.map((n) => (
            <button
              key={n}
              type="button"
              className={n === nivel ? "chip chip--activo" : "chip"}
              aria-pressed={n === nivel}
              onClick={() => setNivel(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <p className="contador" data-testid="contador">
        {visibles.length} de {cursos.length} cursos
      </p>

      <ul className="grilla">
        {visibles.map((c) => (
          <li key={c.id} className="card">
            <span className={`badge badge--${c.nivel}`}>{c.nivel}</span>
            <h2>{c.titulo}</h2>
            <p>{c.descripcion}</p>
            <small>
              {c.horas} horas · cupo {c.cupo}
            </small>
            {accion && <div className="card__accion">{accion(c)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
