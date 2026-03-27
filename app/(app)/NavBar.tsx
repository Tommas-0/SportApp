"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const NAV_GROUPS = [
  {
    label: "Entraînement",
    links: [
      { href: "/templates",       label: "Programmes" },
      { href: "/sessions",        label: "Historique" },
      { href: "/sessions/manual", label: "Saisie manuelle" },
      { href: "/exercises",       label: "Exercices" },
    ],
  },
  {
    label: "Stats",
    links: [
      { href: "/progress",    label: "Progression" },
      { href: "/records",     label: "Records" },
      { href: "/badges",      label: "Badges" },
      { href: "/body-stats",  label: "Mesures" },
    ],
  },
  {
    label: "Santé",
    links: [
      { href: "/steps",    label: "Pas" },
      { href: "/sleep",    label: "Sommeil" },
      { href: "/calories", label: "Calories" },
    ],
  },
];

const ALL_LINKS = NAV_GROUPS.flatMap((g) => g.links);

function DropdownMenu({
  group,
  isGroupActive,
  isActive,
}: {
  group: (typeof NAV_GROUPS)[number];
  isGroupActive: boolean;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          isGroupActive
            ? "bg-zinc-800 text-white font-medium"
            : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
        }`}
      >
        {group.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-xl py-1 z-50">
          {group.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                isActive(link.href)
                  ? "text-white font-medium bg-zinc-800/60"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  function isGroupActive(group: (typeof NAV_GROUPS)[number]) {
    return group.links.some((l) => isActive(l.href));
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo + hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            className="md:hidden text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.webp" alt="Logo" width={28} height={28} className="rounded-lg shrink-0" />
            <span className="font-semibold text-sm text-white hidden sm:block">Sport Tracker</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
          <Link
            href="/dashboard"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive("/dashboard")
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            Dashboard
          </Link>

          {NAV_GROUPS.map((group) => (
            <DropdownMenu
              key={group.label}
              group={group}
              isGroupActive={isGroupActive(group)}
              isActive={isActive}
            />
          ))}
        </div>

        <LogoutButton />
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 py-2 grid grid-cols-2 gap-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive("/dashboard")
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              Dashboard
            </Link>
            {ALL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive(link.href)
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
