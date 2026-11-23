"use client";

import { useEffect } from "react";
import { initialiserSession } from "@/lib/serveur";

/** Démarre la session Supabase une fois, pour toute l'appli. */
export function Session() {
  useEffect(() => {
    initialiserSession();
  }, []);
  return null;
}
