import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getPageAuth } from "@/features/billing/auth";
import { AuthNotice } from "@/features/billing/components/auth-notice";
import { IssueInvoiceButton, VoidInvoiceButton } from "@/features/billing/components/invoice-actions";
import { InvoiceDetail } from "@/features/billing/components/invoice-detail";
import { getInvoice } from "@/features/billing/invoices/service";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getPageAuth();
  if (auth.status !== "ok") {
    return (
      <>
        <PageHeader title="Invoice" />
        <AuthNotice status={auth.status} />
      </>
    );
  }

  const canManage = auth.profile.role === "admin" || auth.profile.role === "staff";
  const { data, error } = await getInvoice(auth.supabase, id);
  if (error) {
    // PGRST116 = no row (missing, or hidden by RLS); 22P02 = malformed uuid
    if (error.code === "PGRST116" || error.code === "22P02") notFound();
    return <p className="text-sm text-destructive">Could not load invoice: {error.message}</p>;
  }

  return (
    <>
      <PageHeader
        title={data.invoice_number}
        description="Invoice details"
        actions={
          <>
            {canManage && data.status === "draft" ? <IssueInvoiceButton invoiceId={data.id} /> : null}
            {canManage && ["draft", "open", "overdue"].includes(data.status) && data.amount_paid <= 0 ? <VoidInvoiceButton invoiceId={data.id} /> : null}
            <Button asChild variant="outline" size="sm">
              <Link href="/invoices">
                <ArrowLeft /> All invoices
              </Link>
            </Button>
          </>
        }
      />
      <InvoiceDetail invoice={data} canManage={canManage} />
    </>
  );
}
