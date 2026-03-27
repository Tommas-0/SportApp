"use client";

export default function OfflinePage() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 gap-4">
        <p className="text-5xl">📡</p>
        <h1 className="text-lg font-semibold text-white">Pas de connexion</h1>
        <p className="text-sm text-zinc-500 max-w-xs">
          Cette page n&apos;est pas disponible hors ligne. Les pages que tu as déjà visitées restent accessibles.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm rounded-xl px-5 py-2.5 transition-colors"
        >
          ← Retour
        </button>
      </div>
    </>
  );
}
