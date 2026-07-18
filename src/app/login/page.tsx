"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  // Passwords are the day-to-day path — magic links cost an email each
  // (Supabase's built-in sender allows only a few per hour).
  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function sendLink() {
    if (!email) {
      setStatus("error");
      setMessage("Enter your email first.");
      return;
    }
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Valedictorian Run
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your course materials, compiled into a study system.
        </p>

        {urlError === "not-allowed" && (
          <p className="mt-6 rounded-md border p-3 text-sm">
            This account isn&apos;t on the allowlist. Valedictorian Run is a
            private study tool.
          </p>
        )}

        {status === "sent" ? (
          <p className="mt-6 rounded-md border p-3 text-sm">
            Check your inbox — a sign-in link is on its way to{" "}
            <span className="font-medium">{email}</span>.
          </p>
        ) : (
          <form onSubmit={signInWithPassword} className="mt-8 space-y-3">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700"
            />
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {status === "sending" ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={sendLink}
              className="w-full text-center text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Email me a magic link instead
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">{message}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
