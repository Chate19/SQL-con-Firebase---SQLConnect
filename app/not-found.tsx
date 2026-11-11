import Link from "next/link";

export default function NotFound() {
  return (
    <section>
      <h1>404 · Página no encontrada</h1>
      <p>
        La ruta que buscás no existe. <Link href="/">Volver al inicio</Link>.
      </p>
    </section>
  );
}
