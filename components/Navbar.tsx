"use client";

import { BellRing, CalendarDays, Home, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import VoiceToggle from "@/components/VoiceToggle";

const LINKS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface NavbarUser {
  name: string;
  email: string;
}

interface NavbarProps {
  user: NavbarUser | null;
  authEnabled: boolean;
}

export default function Navbar({ user, authEnabled }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between py-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BellRing className="h-4 w-4" />
            </span>
            Remindly
          </Link>
          {user ? (
            <div className="flex items-center gap-1">
              {/* On computers the tabs sit in the top bar; on phones they move to the bottom. */}
              <nav className="hidden items-center gap-1 md:flex">
                {LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                      pathname === href
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
              <VoiceToggle />
              {authEnabled && (
                <button
                  type="button"
                  aria-label="Log out"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link href="/register" className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500">
                Register
              </Link>
            </nav>
          )}
        </div>
      </header>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-semibold transition active:scale-95 ${
                pathname === href ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500"
              }`}
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                  pathname === href ? "bg-indigo-50 dark:bg-indigo-950" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
