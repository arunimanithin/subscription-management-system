import Link from "next/link";
import { CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getHealth } from "@/lib/health";

export const dynamic = "force-dynamic";
export const metadata = { title: "Health – SubscriptIQ" };

function Row({ ok, label, detail }: { ok: boolean | "warn"; label: string; detail?: string }) {
  const Icon = ok === true ? CheckCircle2 : ok === "warn" ? CircleAlert : CircleX;
  const color = ok === true ? "text-emerald-600" : ok === "warn" ? "text-amber-600" : "text-red-600";
  return (
    <li className="flex items-start gap-3 py-2">
      <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} />
      <div>
        <div className="text-sm font-medium">{label}</div>
        {detail ? <div className="text-sm text-muted-foreground">{detail}</div> : null}
      </div>
    </li>
  );
}

export default async function HealthPage() {
  const h = await getHealth();
  const s = h.supabase.status;
  return (
    <main className="mx-auto max-w-xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>SubscriptIQ health</CardTitle>
          <CardDescription>Checked {h.checked_at}. Key values are never shown.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            <Row ok label="Application is running" />
            <Row ok={h.env.supabase_url} label="NEXT_PUBLIC_SUPABASE_URL set" />
            <Row ok={h.env.supabase_anon_key} label="NEXT_PUBLIC_SUPABASE_ANON_KEY set" />
            <Row
              ok={s === "ready" ? true : s === "not_configured" ? "warn" : false}
              label={`Supabase: ${s.replace(/_/g, " ")}`}
              detail={h.supabase.detail}
            />
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            JSON version: <Link className="text-primary underline" href="/api/health">/api/health</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
