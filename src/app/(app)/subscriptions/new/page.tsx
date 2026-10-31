import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { SubscriptionForm } from "@/features/subscriptions";

const temporaryCustomers = [
  { id: "f2d0b930-3d9f-4bd2-a90d-7a88434a0001", name: "Amit Sharma", email: "amit.sharma@demo.local" },
  { id: "a4ad9b7b-8d13-4da5-a4c8-34caf6f5a002", name: "Priya Nair", email: "priya.nair@demo.local" },
  { id: "b7fa0dbd-4d0d-483f-9f9b-90901c2c2003", name: "Rohan Iyer", email: "rohan.iyer@demo.local" },
];

const temporaryProducts = [
  { id: "0c0f909b-079f-48ac-bc3e-3adad2e62f01", name: "Pro Plan", description: "Starter business bundle", price: 2400, sku: "PRO-001" },
  { id: "14b7a838-9a0f-490e-b2dc-1098d6bc91f2", name: "Enterprise Suite", description: "Advanced platform bundle", price: 6400, sku: "ENT-002" },
  { id: "21af5e46-06d3-4cc4-9466-1ca0d44e7a03", name: "Analytics Add-on", description: "Insight and forecasting pack", price: 1800, sku: "ANL-003" },
];

export default function NewSubscriptionPage() {
  return (
    <>
      <PageHeader
        title="Create subscription"
        description="Build a new recurring subscription from a customer and selected products or plans."
        actions={
          <Button asChild variant="outline">
            <Link href="/subscriptions">Back to list</Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Temporary integration seam</CardTitle>
          <CardDescription>
            Customer and product data are stubbed locally until Member 1 pushes the real customer and product APIs.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The form is ready to swap to live Member 1 data as soon as the real endpoints exist.
        </CardContent>
      </Card>

      <SubscriptionForm customers={temporaryCustomers} products={temporaryProducts} />
    </>
  );
}
