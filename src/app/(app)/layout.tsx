"use client";
import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { AppModal } from "@/components/layout/AppModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Auth still resolving for a returning user — render nothing rather than
  // flashing "Redirecting…" before onAuthStateChanged fires.
  if (!user) {
    if (loading) return null;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      {/* Each section supplies its own body layout: `menu/` adds a sidebar,
          `(standard)/` is a single centered column. */}
      {children}
      <AppModal />
    </div>
  );
}
