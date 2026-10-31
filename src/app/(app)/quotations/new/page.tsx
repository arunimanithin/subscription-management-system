import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default function NewQuotationPage() {
  return (
    <>
      <PageHeader
        title="Create quotation"
        description="Draft a new quotation with multiple line items and pricing preview."
        actions={
          <Button asChild variant="outline">
            <Link href="/quotations">Back to quotations</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Pending integration</CardTitle>
          <CardDescription>
            The live quotation form will be completed once the customer and product APIs are available from Member 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This page is a placeholder so the management list remains navigable while the final form and conversion flow are being built.
        </CardContent>
      </Card>
    </>
  );
}
