import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "./NavBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ServiceWorkerManager } from "@/components/pwa/ServiceWorkerManager";
import { SplashDismisser } from "@/components/pwa/SplashDismisser";
import { ToastProvider } from "@/lib/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-950 text-white">
        <NavBar />
        <main className="px-6 py-8 max-w-4xl mx-auto">
          {children}
        </main>
        <InstallPrompt />
        <ServiceWorkerManager />
        <SplashDismisser />
      </div>
    </ToastProvider>
  );
}
