"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebase } from "./firebase";

/** Usuario autenticado actual. `undefined` mientras Firebase Auth todavía no respondió. */
export function useUsuario(): User | null | undefined {
  const [usuario, setUsuario] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(firebase().auth, setUsuario), []);
  return usuario;
}
