"use client";

import { useState, useEffect, useTransition } from "react";
import { subscribePushAction, unsubscribePushAction } from "@/app/actions/push";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64     = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushNotifications({ savedEndpoint }: { savedEndpoint: string | null }) {
  const [supported,    setSupported]    = useState(false);
  const [permission,   setPermission]   = useState<NotificationPermission>("default");
  const [subscribed,   setSubscribed]   = useState(false);
  const [endpoint,     setEndpoint]     = useState<string | null>(savedEndpoint);
  const [isPending,    startTransition] = useTransition();
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    setPermission(Notification.permission);

    // Vérifier si déjà abonné
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) { setSubscribed(true); setEndpoint(sub.endpoint); }
      })
    );
  }, []);

  async function handleSubscribe() {
    setError(null);
    const reg = await navigator.serviceWorker.ready;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") { setError("Permission refusée par le navigateur."); return; }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });

    startTransition(async () => {
      const result = await subscribePushAction({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
          auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
        },
      });

      if (result.success) {
        setSubscribed(true);
        setEndpoint(sub.endpoint);
      } else {
        setError(result.error);
        await sub.unsubscribe();
      }
    });
  }

  async function handleUnsubscribe() {
    setError(null);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    await sub?.unsubscribe();

    if (endpoint) {
      startTransition(async () => {
        await unsubscribePushAction(endpoint);
        setSubscribed(false);
        setEndpoint(null);
      });
    }
  }

  if (!supported) return null;

  return (
    <div className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Notifications push</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {subscribed ? "Activées — rappels et streak en danger" : "Rappels d'entraînement, streak en danger"}
          </p>
        </div>

        {subscribed ? (
          <button
            onClick={handleUnsubscribe}
            disabled={isPending}
            className="text-xs text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-900 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            {isPending ? "…" : "Désactiver"}
          </button>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={isPending || permission === "denied"}
            className="text-xs bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-medium rounded-lg px-3 py-1.5 transition-colors"
          >
            {isPending ? "…" : "Activer"}
          </button>
        )}
      </div>

      {permission === "denied" && (
        <p className="text-xs text-amber-500">
          Notifications bloquées dans les réglages du navigateur. Autorise-les manuellement.
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {subscribed && (
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          Connecté · rappel chaque soir si streak en danger
        </div>
      )}
    </div>
  );
}
