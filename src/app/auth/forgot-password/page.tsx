
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage(
          "Password reset link sent! Please check your email inbox.",
        );
      }
    } catch {
      setError("Unable to send reset email. Please check your Supabase settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <section className="rounded-xl border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Forgot Password?</h1>

        <p className="mt-2 text-sm text-gray-600">
          Enter your registered email address and we&apos;ll send you a
          password reset link.
        </p>

        <form onSubmit={handleReset} className="mt-6 space-y-4">
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
              placeholder="Enter your email"
              className="w-full rounded-md border p-3"
            />
          </div>

          {message && (
            <p role="status" className="text-sm text-green-600">
              {message}
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
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-4 text-sm">
          Remember your password?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-blue-600 underline"
          >
            Back to Login
          </Link>
        </p>
      </section>
    </main>
  );
}
