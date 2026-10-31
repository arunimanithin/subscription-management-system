import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Quotation details"
        description={`Review the quotation ${id} and its lifecycle state.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/quotations">Back to quotations</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Detail view pending final flow</CardTitle>
          <CardDescription>Quotation detail actions will be added after the live create flow and conversion workflow are ready.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The route is active and ready to receive the real quotation detail implementation when the final conversion and lifecycle work is complete.
        </CardContent>
      </Card>
    </>
  );
}
