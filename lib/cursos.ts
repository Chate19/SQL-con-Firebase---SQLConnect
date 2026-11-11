export type Nivel = "inicial" | "intermedio" | "avanzado";

/**
 * Forma de un curso tal como la devuelve la query ListCursos.
 * Los datos ya no viven en el código: están en PostgreSQL (ver dataconnect/seed_data.gql).
 */
export interface Curso {
  id: string;
  titulo: string;
  nivel: Nivel;
  horas: number;
  descripcion: string;
  cupo: number;
}
