import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Emails autorisés, séparés par des virgules dans .env.local
// Ex: ALLOWED_EMAILS=toi@gmail.com,ami@gmail.com
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const PROTECTED_PREFIXES = ["/dashboard", "/templates", "/sessions", "/progress", "/body-stats", "/exercises", "/badges", "/records"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // 1. Non authentifié → login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Authentifié mais email non autorisé → déconnexion forcée
  if (user && ALLOWED_EMAILS.length > 0) {
    const email = user.email?.toLowerCase() ?? "";
    if (!ALLOWED_EMAILS.includes(email)) {
      // Invalide la session côté Supabase
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }
  }

  // 3. Déjà connecté et autorisé → pas besoin de revoir /login
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/templates/:path*",
    "/sessions/:path*",
    "/progress/:path*",
    "/body-stats/:path*",
    "/exercises/:path*",
    "/badges/:path*",
    "/records/:path*",
    "/login",
  ],
};
