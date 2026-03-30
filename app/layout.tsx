import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sport Tracker",
  description: "Suivi personnel de séances sportives",
  appleWebApp: {
    capable: true,
    title: "Sport Tracker",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full bg-zinc-950 antialiased">

        {/* ── Splash screen PWA ──────────────────────────────────
            Affiché par défaut via inline style (avant tout CSS).
            Masqué immédiatement en mode browser par le script inline.
            Masqué après hydration par SplashDismisser en mode standalone.
        ─────────────────────────────────────────────────────── */}
        <div
          id="__splash"
          aria-hidden="true"
          style={{
            display:         "flex",
            position:        "fixed",
            inset:           0,
            zIndex:          9999,
            background:      "linear-gradient(160deg, #0c0c0f 0%, #18181b 60%, #0f0f12 100%)",
            flexDirection:   "column",
            alignItems:      "center",
            justifyContent:  "center",
            pointerEvents:   "none",
            transition:      "opacity 0.45s ease",
          }}
        >
          {/* Logo */}
          <div style={{
            width: 88, height: 88, borderRadius: 22,
            overflow: "hidden",
            boxShadow: "0 0 40px rgba(249,115,22,0.25), 0 8px 32px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* App name */}
          <p style={{
            color: "white", marginTop: 20, fontSize: 20,
            fontWeight: 700, letterSpacing: "-0.03em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            Sport Tracker
          </p>
          <p style={{
            color: "#71717a", marginTop: 4, fontSize: 13,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            Chargement…
          </p>

          {/* Spinner */}
          <div style={{
            marginTop: 40, width: 28, height: 28, borderRadius: "50%",
            border: "2.5px solid #27272a",
            borderTopColor: "#f97316",
            animation: "splash-spin 0.75s linear infinite",
          }} />

          <style>{`
            @keyframes splash-spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>

        {/* Script inline : masque le splash immédiatement en mode browser (avant CSS) */}
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
                || (window.navigator && window.navigator.standalone === true);
              if (!standalone) {
                var el = document.getElementById('__splash');
                if (el) el.style.display = 'none';
              }
            } catch(e) {}
          })();
        `}} />

        {children}
      </body>
    </html>
  );
}
