import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1>Bienvenidos al Catálogo de Cursos</h1>
      <p className="lead">
        Esta app es el punto de partida de la práctica. No vas a programar features: vas a
        construir el <strong>camino a producción</strong> (pipeline, entornos de preview,
        rollback) y a <strong>endurecer la seguridad</strong> de lo que se sirve.
      </p>

      {/*
        Imagen externa a propósito: cuando configures la Content-Security-Policy,
        vas a tener que decidir qué orígenes de imágenes permitís (img-src).
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="hero"
        src="https://picsum.photos/seed/programacion-avanzada/960/320"
        alt="Imagen decorativa de portada"
        width={960}
        height={320}
      />

      <p>
        <Link className="button" href="/cursos">
          Ver cursos →
        </Link>
      </p>
    </section>
  );
}
