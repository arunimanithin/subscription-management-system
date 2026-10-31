
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/guards";

export default function SignPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    // ?reset=1 is added after a successful password reset.
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setNotice("Your password was updated. Sign in with the new password.");
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError(loginError.message);
      } else {
        // Go back to the page they were trying to open (?next=...), else "/" which sends each role to its home.
        const next = safeNext(new URLSearchParams(window.location.search).get("next"));
        window.location.assign(next ?? "/");
      }
    } catch {
      setError(
        "Supabase is not configured. Please check your .env.local settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <section className="rounded-xl border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to your subscription management account.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border p-3"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>

            <div className="flex items-center gap-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border p-3"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="rounded-md border px-3 py-3 text-sm font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="text-right">
  <Link
    href="/auth/forgot-password"
    className="text-sm font-medium text-blue-600 underline"
  >
    Forgot password?
  </Link>
</div>
          </div>

          {notice && (
            <p role="status" className="text-sm text-green-700">
              {notice}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 p-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-blue-600 underline"
          >
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
