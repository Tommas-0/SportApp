"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id:       string;
  type:     ToastType;
  message:  string;
  duration: number;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType, duration?: number) => void;
};

// ─── Context ──────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 3500) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");

  return {
    success: (msg: string, duration?: number) => ctx.toast(msg, "success", duration),
    error:   (msg: string, duration?: number) => ctx.toast(msg, "error",   duration ?? 5000),
    info:    (msg: string, duration?: number) => ctx.toast(msg, "info",    duration),
    warning: (msg: string, duration?: number) => ctx.toast(msg, "warning", duration),
  };
}

// ─── Styles par type ──────────────────────────────────────────

const STYLES: Record<ToastType, { bar: string; icon: string; label: string }> = {
  success: { bar: "bg-green-500",  icon: "✓", label: "text-green-400" },
  error:   { bar: "bg-red-500",    icon: "✕", label: "text-red-400"   },
  info:    { bar: "bg-blue-500",   icon: "ℹ", label: "text-blue-400"  },
  warning: { bar: "bg-amber-500",  icon: "⚠", label: "text-amber-400" },
};

// ─── Container ────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── Item ─────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const s = STYLES[toast.type];

  return (
    <div
      className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-bottom-3 fade-in duration-300"
      onClick={() => onDismiss(toast.id)}
    >
      <div className="relative overflow-hidden bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/30">
        {/* Barre colorée en haut */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.bar}`} />

        <div className="flex items-center gap-3 px-4 py-3">
          <span className={`text-base shrink-0 ${s.label}`}>{s.icon}</span>
          <p className="text-sm text-white flex-1">{toast.message}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
            className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none shrink-0"
          >
            ×
          </button>
        </div>

        {/* Barre de progression */}
        <div
          className={`h-0.5 ${s.bar} opacity-30`}
          style={{
            animation: `shrink ${toast.duration}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
