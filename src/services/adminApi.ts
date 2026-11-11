// Calls this app's API routes (src/app/api) with the signed-in admin's ID token.
// The routes verify it with requireAdmin and take the business from it.
import { auth } from "@/lib/firebase-config";

export async function callAdminApi<T = unknown>(
  path: string,
  { method = "GET", body }: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in again.");
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? text;
    } catch {
      // not JSON: use the text as is
    }
    throw new Error(message || "Something went wrong. Try again.");
  }
  return (text ? JSON.parse(text) : undefined) as T;
}
