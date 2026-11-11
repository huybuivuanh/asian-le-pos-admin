"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Menu, X } from "lucide-react";
import { auth } from "@/lib/firebase-config";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/tables", label: "Tables" },
  { href: "/orders", label: "Orders" },
  { href: "/menu", label: "Menu" },
  { href: "/menu-changes", label: "Menu Changes" },
  { href: "/add-extras", label: "Add Extras" },
  { href: "/customers", label: "Customers" },
  { href: "/rewards", label: "Rewards" },
  { href: "/credits", label: "Credits" },
  { href: "/users", label: "Users" },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

/** "ASIAN [Vietnam map] LE POS", styled like the website logo. */
function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Asian Le POS Admin – Dashboard"
      className="group flex shrink-0 items-center gap-1 rounded-md text-on-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <span className="text-xl font-extrabold tracking-wide transition group-hover:text-gold">
        ASIAN
      </span>
      <Image
        src="/logo.png"
        alt=""
        width={28}
        height={40}
        className="h-10 w-7 object-contain"
        unoptimized
      />
      <span className="text-xl font-extrabold tracking-wide transition group-hover:text-gold">
        LE
      </span>
      <span className="ml-1 text-xs font-bold tracking-widest text-gold uppercase">
        POS
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1280) setMobileOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function handleSignOut() {
    setMobileOpen(false);
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink-line bg-ink/95 text-on-ink backdrop-blur-md print:hidden">
      <nav
        aria-label="Main"
        className="flex items-center gap-6 px-4 py-3 sm:px-6"
      >
        {/* Logo and right side share the leftover space equally, so the links sit in the true center. */}
        <div className="flex flex-1 basis-0 justify-start">
          <Logo onClick={() => setMobileOpen(false)} />
        </div>

        {/* Desktop links, centered */}
        <ul className="hidden items-center gap-5 text-[15px] font-medium xl:flex">
          {navLinks.map(({ href, label }) => {
            const isActive = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-md py-2 whitespace-nowrap transition hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                    isActive ? "text-gold" : "text-on-ink",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-1 basis-0 justify-end">
          <button
            type="button"
            onClick={handleSignOut}
            className="hidden min-h-11 xl:inline-flex items-center rounded-full border border-gold px-5 text-[15px] font-bold whitespace-nowrap text-gold transition hover:bg-gold hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Sign out
          </button>

          {/* Mobile */}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full text-on-ink transition hover:bg-ink-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-gold xl:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            {mobileOpen ? (
              <X className="size-6" aria-hidden />
            ) : (
              <Menu className="size-6" aria-hidden />
            )}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out xl:hidden",
          mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="overflow-hidden">
          <div className="border-t border-ink-line px-4 pt-3 pb-6">
            <ul>
              {navLinks.map(({ href, label }) => {
                const isActive = isActivePath(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "block rounded-xl px-3 py-3.5 text-base font-semibold transition hover:bg-ink-raised",
                        isActive ? "text-gold" : "text-on-ink",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full border border-ink-line text-base font-semibold text-gold transition hover:bg-ink-raised"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
