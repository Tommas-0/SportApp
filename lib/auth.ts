import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * À appeler en tête de chaque Server Component ou Server Action sensible.
 * Redirige vers /login si la session est invalide ou expirée.
 *
 * Usage dans un Server Component :
 *   const user = await requireAuth();
 *
 * Usage dans une Server Action :
 *   const user = await requireAuth();
 *   // ... logique métier utilisant user.id
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return user;
}

/**
 * Vérifie l'auth sans rediriger — utile dans les Server Actions
 * qui doivent retourner une erreur JSON plutôt que rediriger.
 *
 * Usage :
 *   const user = await getAuthUser();
 *   if (!user) return { success: false, error: "Non authentifié" };
 */
export async function getAuthUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
