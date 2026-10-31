"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/** Shows who is signed in and a Sign out button. Safe to place in any layout. */
export function SignOutButton({ className }: { className?: string }) {
  const [who, setWho] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: { email?: string | null; full_name?: string | null; role?: string } } | null) => {
        if (cancelled || !body?.data) return;
        const name = body.data.full_name || body.data.email;
        setWho(name ? `${name} · ${body.data.role}` : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.assign("/auth/login"); // full reload so no signed-in page stays cached
    }
  }

  return (
    <div className={className}>
      {who ? <p className="mb-2 truncate text-xs text-muted-foreground">{who}</p> : null}
      <Button variant="outline" size="sm" className="w-full" onClick={signOut} disabled={busy}>
        <LogOut /> {busy ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
}
