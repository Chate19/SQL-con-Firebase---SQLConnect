import type { Metadata } from "next";
import Link from "next/link";
import { buildInfo } from "@/lib/build-info";
import AuthPanel from "./components/AuthPanel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catálogo de Cursos | Práctica CI/CD",
  description: "App de ejemplo para la práctica de despliegue continuo con Firebase Hosting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Catálogo de Cursos
          </Link>
          <nav>
            <Link href="/">Inicio</Link>
            <Link href="/cursos">Cursos</Link>
            <Link href="/mis-inscripciones">Mis inscripciones</Link>
            <AuthPanel />
          </nav>
        </header>

        <main className="container">{children}</main>

        <footer className="site-footer">
          <span>
            Versión <code data-testid="build-sha">{buildInfo.commit}</code>
          </span>
          <span>
            Rama <code>{buildInfo.branch}</code>
          </span>
          <span>Build: {buildInfo.builtAt}</span>
        </footer>
      </body>
    </html>
  );
}
