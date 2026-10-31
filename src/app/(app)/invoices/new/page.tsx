import { PageHeader } from "@/components/shared/page-header";
import { getPageAuth } from "@/features/billing/auth";
import { AuthNotice } from "@/features/billing/components/auth-notice";
import { InvoiceForm, type CustomerOption, type PlanOption } from "@/features/billing/components/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const auth = await getPageAuth();
  const header = <PageHeader title="New invoice" description="Creates a draft invoice. Prices are copied onto the invoice as a snapshot." />;
  if (auth.status !== "ok") {
    return (
      <>
        {header}
        <AuthNotice status={auth.status} />
      </>
    );
  }
  if (auth.profile.role === "customer") {
    return (
      <>
        {header}
        <p className="text-sm text-muted-foreground">Only admin and staff users can create invoices.</p>
      </>
    );
  }

  const [customersRes, plansRes] = await Promise.all([
    auth.supabase.from("customers").select("id, name, company").eq("status", "active").order("name"),
    auth.supabase
      .from("plans")
      .select("id, name, price, tax_rate, product_id, product:products(name)")
      .eq("is_active", true)
      .order("name"),
  ]);

  const customers = (customersRes.data ?? []) as CustomerOption[];
  const plans: PlanOption[] = (plansRes.data ?? []).map((p) => {
    const product = p.product as { name: string } | { name: string }[] | null;
    return {
      id: p.id as string,
      name: p.name as string,
      price: Number(p.price),
      tax_rate: Number(p.tax_rate),
      product_id: p.product_id as string,
      product_name: (Array.isArray(product) ? product[0]?.name : product?.name) ?? "Product",
    };
  });

  return (
    <>
      {header}
      {customers.length === 0 ? (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          There are no active customers yet. Add a customer first (Member 1&apos;s module), or insert one in the Supabase Table Editor.
        </p>
      ) : null}
      <InvoiceForm customers={customers} plans={plans} />
    </>
  );
}
