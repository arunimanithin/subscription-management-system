import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MODULES, type ModuleKey } from "@/config/modules";

/** Temporary page body. The module owner replaces the whole page file. */
export function ModulePlaceholder({ module, title, description }: { module: ModuleKey; title: string; description: string }) {
  const m = MODULES[module];
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="size-4 text-amber-600" /> Not built yet
          </CardTitle>
          <CardDescription>
            Owned by {m.owner} ({m.name}) on branch <code className="rounded bg-muted px-1">{m.branch}</code>. See CONTRACTS.md
            for the contract this page must follow.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Replace this file with the real implementation.</CardContent>
      </Card>
    </>
  );
}
