"use client";

import {
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";
import { adminBusinessFromClaims, setBusinessId } from "@/lib/business";
import { auth } from "@/lib/firebase-config";
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPersistence(auth, browserLocalPersistence);

    // Only admins of a business get in: the claims set the business for every
    // Firestore path (business.ts). The access check is async; only the latest event counts.
    let latest = 0;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const run = ++latest;
      let businessId: string | null = null;
      if (firebaseUser) {
        try {
          const { claims } = await firebaseUser.getIdTokenResult();
          businessId = adminBusinessFromClaims(claims);
        } catch {
          businessId = null;
        }
        if (run !== latest) return;
        if (!businessId) {
          await signOut(auth); // fires again with null
          return;
        }
      }
      setBusinessId(businessId);
      if (firebaseUser) {
        localStorage.setItem("wasLoggedIn", "true");
      } else {
        localStorage.removeItem("wasLoggedIn");
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Returning users: skip the spinner and render children optimistically.
  // AppLayout suppresses the redirect while loading is still true.
  // Read localStorage only after mount so server and client initial HTML match.
  const wasLoggedIn =
    mounted && localStorage.getItem("wasLoggedIn") === "true";

  if (loading && !wasLoggedIn) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-muted/30">
        <div
          className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
