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

    // Vérifier si on est en mode standalone (PWA installée)
    const isStandalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    if (!isStandalone) {
      // En mode browser : masquer immédiatement (le script inline l'a déjà fait,
      // mais on s'assure ici au cas où le script n'aurait pas eu le temps de s'exécuter)
      el.style.display = "none";
      return;
    }

    // En mode standalone : laisser le splash visible le temps que l'app soit prête,
    // puis le faire disparaître en douceur
    const t1 = setTimeout(() => {
      el.style.opacity = "0";
    }, 300);

    const t2 = setTimeout(() => {
      el.style.display = "none";
    }, 800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return null;
}
