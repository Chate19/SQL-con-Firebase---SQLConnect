import type { NextConfig } from "next";

/**
 * Export estático: `next build` genera HTML/CSS/JS en la carpeta `out/`,
 * que es lo que Firebase Hosting sirve.
 *
 * Decisión de arquitectura (para discutir en clase):
 * Firebase Hosting en plan Spark solo sirve archivos estáticos. Para SSR,
 * Server Actions o Route Handlers dinámicos habría que usar App Hosting,
 * que corre sobre Cloud Run y requiere el plan Blaze (cuenta de facturación).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: {
    // El optimizador de imágenes de Next necesita un servidor; en export estático se desactiva.
    unoptimized: true,
  },
};

export default nextConfig;
