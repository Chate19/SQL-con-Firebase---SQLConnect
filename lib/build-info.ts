/**
 * Información del build, inyectada por el pipeline como variables de entorno
 * en tiempo de build (NEXT_PUBLIC_* se "hornea" en el bundle estático).
 *
 * Sirve para verificar QUÉ versión está desplegada en cada canal
 * (preview vs. live) y comprobar que un rollback funcionó.
 */
export const buildInfo = {
  commit: process.env.NEXT_PUBLIC_BUILD_SHA?.slice(0, 7) ?? "local",
  branch: process.env.NEXT_PUBLIC_BUILD_REF ?? "local",
  builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? "sin fecha (build local)",
};
