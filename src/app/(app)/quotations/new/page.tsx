"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { QuotationForm, type CustomerOption, type PlanOption, type ProductOption } from "@/features/quotations";

const temporaryCustomers: CustomerOption[] = [
  { id: "f2d0b930-3d9f-4bd2-a90d-7a88434a0001", name: "Amit Sharma", email: "amit.sharma@demo.local" },
  { id: "a4ad9b7b-8d13-4da5-a4c8-34caf6f5a002", name: "Priya Nair", email: "priya.nair@demo.local" },
  { id: "b7fa0dbd-4d0d-483f-9f9b-90901c2c2003", name: "Rohan Iyer", email: "rohan.iyer@demo.local" },
];

const temporaryProducts: ProductOption[] = [
  { id: "0c0f909b-079f-48ac-bc3e-3adad2e62f01", name: "Pro Plan", description: "Starter business bundle", price: 2400, sku: "PRO-001" },
  { id: "14b7a838-9a0f-490e-b2dc-1098d6bc91f2", name: "Enterprise Suite", description: "Advanced platform bundle", price: 6400, sku: "ENT-002" },
  { id: "21af5e46-06d3-4cc4-9466-1ca0d44e7a03", name: "Analytics Add-on", description: "Insight and forecasting pack", price: 1800, sku: "ANL-003" },
];

export default function NewQuotationPage() {
  const [customers, setCustomers] = useState<CustomerOption[]>(temporaryCustomers);
  const [products, setProducts] = useState<ProductOption[]>(temporaryProducts);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [customersRes, productsRes, plansRes] = await Promise.all([
          fetch("/api/customers?page_size=100"),
          fetch("/api/products?page_size=100&status=active"),
          fetch("/api/plans?page_size=100&status=active"),
        ]);

        const customerBody = customersRes.ok ? await customersRes.json() : null;
        const productsBody = productsRes.ok ? await productsRes.json() : null;
        const plansBody = plansRes.ok ? await plansRes.json() : null;

        if (!active) return;

        const fetchedCustomers = ((customerBody?.data ?? []) as Array<{ id: string; name: string; email?: string | null }>).map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
        }));

        const fetchedProducts = ((productsBody?.data ?? []) as Array<{ id: string; name: string; description?: string | null; sku?: string | null }>).map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          sku: product.sku,
          price: 0,
        }));

        const fetchedPlans = ((plansBody?.data ?? []) as Array<{
          id: string;
          name: string;
          price: number;
          currency?: string;
          product_id: string;
          description?: string | null;
          product?: { id: string; name: string } | null;
        }>).map((plan) => ({
          id: plan.id,
          name: plan.name,
          price: Number(plan.price ?? 0),
          currency: plan.currency ?? "INR",
          product_id: plan.product_id,
          product_name: plan.product?.name ?? plan.name,
          description: plan.description,
        }));

        setCustomers(fetchedCustomers.length > 0 ? fetchedCustomers : temporaryCustomers);
        setProducts(fetchedProducts.length > 0 ? fetchedProducts : temporaryProducts);
        setPlans(fetchedPlans);

        if (!customersRes.ok || !productsRes.ok || !plansRes.ok) {
          setError("Member 1 APIs are unavailable; the temporary fallback data is currently in use.");
        }
      } catch (loadError) {
        if (!active) return;
        setCustomers(temporaryCustomers);
        setProducts(temporaryProducts);
        setPlans([]);
        setError(loadError instanceof Error ? loadError.message : "Unable to load customer, product and plan data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

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

      {error ? (
        <Card className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
          <CardHeader>
            <CardTitle>Temporary data fallback</CardTitle>
            <CardDescription className="text-amber-800">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-amber-900">
            The quotation form remains usable while the live Member 1 customer, product and plan APIs are being integrated separately.
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading customers, products and plans...</CardContent>
        </Card>
      ) : (
        <QuotationForm customers={customers} products={products} plans={plans} />
      )}
    </>
  );
}
