"use client";

import { executeMutation, executeQuery, mutationRef, queryRef } from "firebase/data-connect";
import { firebase } from "./firebase";
import type { Curso } from "./cursos";

/**
 * Capa de acceso a datos. Cada función invoca POR NOMBRE una operación definida en
 * dataconnect/cursos/*.gql. Si la operación no existe (o @auth la rechaza), la promesa
 * se rechaza con el error del servidor.
 *
 * Nota: SQL Connect también puede GENERAR un SDK tipado a partir de los .gql
 * (`firebase dataconnect:sdk:generate`). Acá lo escribimos a mano para ver qué hay
 * debajo: un nombre de operación + variables.
 */

// ── Tipos de respuesta (deben coincidir con lo que pide cada query) ──────────
interface ListCursosData {
  cursos: Curso[];
}

export interface Inscripcion {
  fecha: string;
  curso: Pick<Curso, "id" | "titulo" | "nivel" | "horas">;
}
interface MisInscripcionesData {
  alumno: { nombre: string; matriculas: Inscripcion[] } | null;
}

interface CursoVars {
  cursoId: string;
}

// ── Queries ────────────────────────────────────────────────────────────────
export async function listarCursos(): Promise<Curso[]> {
  const { dc } = firebase();
  const { data } = await executeQuery(queryRef<ListCursosData>(dc, "ListCursos"));
  return data.cursos;
}

export async function misInscripciones(): Promise<Inscripcion[]> {
  const { dc } = firebase();
  const { data } = await executeQuery(queryRef<MisInscripcionesData>(dc, "MisInscripciones"));
  return data.alumno?.matriculas ?? [];
}

// ── Mutations ──────────────────────────────────────────────────────────────
export async function registrarAlumno(nombre: string): Promise<void> {
  const { dc } = firebase();
  await executeMutation(mutationRef<unknown, { nombre: string }>(dc, "UpsertAlumno", { nombre }));
}

export async function inscribirme(cursoId: string): Promise<void> {
  const { dc } = firebase();
  await executeMutation(mutationRef<unknown, CursoVars>(dc, "Inscribirme", { cursoId }));
}

export async function darmeDeBaja(cursoId: string): Promise<void> {
  const { dc } = firebase();
  await executeMutation(mutationRef<unknown, CursoVars>(dc, "DarmeDeBaja", { cursoId }));
}

/** Mensaje legible a partir de un error de Firebase / SQL Connect. */
export function mensajeDeError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
