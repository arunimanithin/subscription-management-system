"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stage = "checking" | "ready" | "invalid";

/**
 * Landing page of the link in the "reset your password" email (Supabase redirects here).
 * The link carries a one-time code; getSession() exchanges it for a temporary signed-in session,
 * and updateUser() then sets the new password.
 */
export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const supabase = createClient();
        // The reset link may also come back with an error (for example an expired link).
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const query = new URLSearchParams(window.location.search);
        if (hash.get("error") || query.get("error")) {
          if (!cancelled) setStage("invalid");
          return;
        }
        const { data } = await supabase.auth.getSession(); // completes the code exchange when ?code= is present
        if (!cancelled) setStage(data.session ? "ready" : "invalid");
      } catch {
        if (!cancelled) setStage("invalid");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await supabase.auth.signOut(); // make them sign in with the new password
      window.location.assign("/auth/login?reset=1");
    } catch {
      setError("Could not update the password. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <section className="rounded-xl border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Choose a new password</h1>

        {stage === "checking" && <p className="mt-4 text-sm text-gray-600">Checking your reset link...</p>}

        {stage === "invalid" && (
          <div className="mt-4 space-y-3 text-sm">
            <p role="alert" className="text-red-600">
              This reset link is invalid or has expired. Reset links work once and only for a short time.
            </p>
            <Link href="/auth/forgot-password" className="font-medium text-blue-600 underline">
              Send me a new link
            </Link>
          </div>
        )}

        {stage === "ready" && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                New password
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
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
              <p className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
                Confirm new password
              </label>
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full rounded-md border p-3"
              />
            </div>

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
              {loading ? "Saving..." : "Update password"}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm">
          <Link href="/auth/login" className="font-medium text-blue-600 underline">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
