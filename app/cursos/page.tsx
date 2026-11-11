import CatalogoSql from "../components/CatalogoSql";

export const metadata = {
  title: "Cursos | Catálogo de Cursos",
};

export default function CursosPage() {
  return (
    <section>
      <h1>Cursos disponibles</h1>
      <p className="hint">
        El catálogo ahora se lee de PostgreSQL a través de SQL Connect (query <code>ListCursos</code>).
      </p>
      <CatalogoSql />
    </section>
  );
}
