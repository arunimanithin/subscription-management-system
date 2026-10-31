import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function SignPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <ModulePlaceholder module="authData" title="Sign in" description="Supabase Auth form (email + password)." />
    </main>
  );
}
