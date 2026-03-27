"use client";

import { useEffect, useState } from "react";
import { getQueue, removeFromQueue } from "@/lib/sync-queue";
import { logSetAction } from "@/app/actions/sets";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export function ServiceWorkerManager() {
  const [isOnline,   setIsOnline]   = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  useEffect(() => {
    // Enregistrement du service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((err) => console.error("SW registration failed:", err));
    }

    setIsOnline(navigator.onLine);
    if (!navigator.onLine) setShowBanner(true);

    async function handleOnline() {
      setIsOnline(true);
      setShowBanner(true);

      // Tenter de vider la queue
      const queue = getQueue();
      if (queue.length === 0) {
        setTimeout(() => setShowBanner(false), 3000);
        return;
      }

      setSyncStatus("syncing");
      let failed = 0;

      for (const item of queue) {
        try {
          const result = await logSetAction({
            session_id:       item.session_id,
            exercise_id:      item.exercise_id,
            set_number:       item.set_number,
            tracking_mode:    item.tracking_mode,
            reps:             item.reps,
            weight_kg:        item.weight_kg,
            duration_seconds: item.duration_seconds,
          });
          if (result.success) {
            removeFromQueue(item.id);
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      setSyncStatus(failed === 0 ? "success" : "error");
      setTimeout(() => {
        setShowBanner(false);
        setSyncStatus("idle");
      }, 4000);
    }

    function handleOffline() {
      setIsOnline(false);
      setSyncStatus("idle");
      setShowBanner(true);
    }

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  const config = {
    idle:    null,
    syncing: { bg: "bg-blue-950/90  border-blue-800",  dot: "bg-blue-400 animate-pulse", text: "text-blue-300",  msg: "Synchronisation en cours…" },
    success: { bg: "bg-green-950/90 border-green-800", dot: "bg-green-400",               text: "text-green-400", msg: "Données synchronisées" },
    error:   { bg: "bg-red-950/90   border-red-800",   dot: "bg-red-400",                 text: "text-red-400",   msg: "Erreur de synchronisation — réessaie plus tard" },
  };

  const offlineConfig = { bg: "bg-zinc-900/95 border-zinc-700", dot: "bg-zinc-500 animate-pulse", text: "text-zinc-300", msg: "Hors ligne — les séries seront synchronisées au retour" };

  const c = !isOnline ? offlineConfig : (config[syncStatus] ?? null);
  if (!c) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm shadow-lg animate-in slide-in-from-top-2 duration-300 ${c.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
        <span className={c.text}>{c.msg}</span>
      </div>
    </div>
  );
}
