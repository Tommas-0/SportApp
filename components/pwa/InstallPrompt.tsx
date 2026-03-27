"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Platform = "android" | "ios" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [platform,     setPlatform]     = useState<Platform>(null);
  const [deferredEvt,  setDeferredEvt]  = useState<BeforeInstallPromptEvent | null>(null);
  const [visible,      setVisible]      = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installing,   setInstalling]   = useState(false);

  useEffect(() => {
    // Déjà installée → rien afficher
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Déjà refusé → rien afficher
    if (localStorage.getItem("pwa-dismissed")) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIOS) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    // Android / Chrome : attendre l'event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvt(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-dismissed", "1");
    setVisible(false);
    setShowIosSteps(false);
  }

  async function handleInstall() {
    if (!deferredEvt) return;
    setInstalling(true);
    await deferredEvt.prompt();
    const { outcome } = await deferredEvt.userChoice;
    setInstalling(false);
    if (outcome === "accepted") {
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop iOS steps */}
      {showIosSteps && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
          onClick={() => setShowIosSteps(false)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Installer l&apos;app</p>
              <button onClick={() => setShowIosSteps(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors text-lg leading-none">×</button>
            </div>

            <div className="space-y-3">
              {[
                {
                  step: "1",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  ),
                  text: <>Appuie sur <span className="text-white font-medium">Partager</span> en bas de Safari</>,
                },
                {
                  step: "2",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                  ),
                  text: <>Sélectionne <span className="text-white font-medium">Sur l&apos;écran d&apos;accueil</span></>,
                },
                {
                  step: "3",
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ),
                  text: <>Appuie sur <span className="text-white font-medium">Ajouter</span> en haut à droite</>,
                },
              ].map(({ step, icon, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <p className="text-sm text-zinc-400">{text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowIosSteps(false)}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
            >
              OK, j&apos;ai compris
            </button>
          </div>
        </div>
      )}

      {/* Bannière bas d'écran */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 animate-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-sm mx-auto border border-zinc-700 bg-zinc-900/95 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl shadow-black/40">
          <Image src="/logo.webp" alt="Logo" width={36} height={36} className="rounded-xl shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Sport Tracker</p>
            <p className="text-xs text-zinc-500">Installer l&apos;app sur votre écran d&apos;accueil</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={dismiss}
              className="text-zinc-600 hover:text-zinc-400 transition-colors p-1"
              aria-label="Ignorer"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {platform === "android" ? (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
              >
                {installing ? "…" : "Installer"}
              </button>
            ) : (
              <button
                onClick={() => setShowIosSteps(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
              >
                Installer
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
