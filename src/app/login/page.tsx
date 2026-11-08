"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { adminBusinessFromClaims } from "@/lib/business";
import { auth } from "@/lib/firebase-config";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      const tokenResult = await user.getIdTokenResult();

      if (adminBusinessFromClaims(tokenResult.claims)) {
        router.push("/");
      } else {
        setError("Access denied: this account isn't an admin of a business.");
        await auth.signOut();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed.");
      }
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4 py-6 sm:py-8">
      <div className="w-full min-w-0 max-w-sm space-y-6">
        <div className="flex flex-col items-center px-1 text-center">
          <div className="flex items-center gap-1 text-foreground">
            <span className="text-2xl font-extrabold tracking-wide">ASIAN</span>
            <Image src="/logo.png" alt="" width={28} height={40} className="h-10 w-7 object-contain" unoptimized />
            <span className="text-2xl font-extrabold tracking-wide">LE</span>
          </div>
          <h1 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">POS Admin</h1>
          <p className="mt-1 text-sm text-foreground/60">Sign in to continue</p>
        </div>

        {error ? (
          <p
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm break-words text-red-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
