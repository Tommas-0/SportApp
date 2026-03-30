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
        {/* Splash screen PWA — visible uniquement en mode standalone via CSS */}
        <div id="__splash" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            style={{ width: 80, height: 80, borderRadius: 16 }}
          />
          <p style={{ color: "white", marginTop: 16, fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Sport Tracker
          </p>
          <div
            style={{
              marginTop: 32,
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "2px solid #3f3f46",
              borderTopColor: "white",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        {children}
      </body>
    </html>
  );
}
