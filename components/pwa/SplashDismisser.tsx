"use client";

import { useEffect } from "react";

/**
 * Fait disparaître le splash screen (#__splash) après l'hydratation React.
 * Le splash est rendu en HTML statique dans app/layout.tsx et visible
 * uniquement en mode PWA standalone (via CSS).
 */
export function SplashDismisser() {
  useEffect(() => {
    const el = document.getElementById("__splash");
    if (!el) return;

    // Léger délai pour que les composants principaux aient le temps de s'afficher
    const t1 = setTimeout(() => {
      el.style.opacity = "0";
    }, 200);

    // Retrait du DOM après la transition
    const t2 = setTimeout(() => {
      el.style.display = "none";
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return null;
}
