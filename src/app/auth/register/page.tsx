import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function CreatePage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <ModulePlaceholder module="authData" title="Create account" description="Supabase Auth form (email + password)." />
    </main>
  );
}
