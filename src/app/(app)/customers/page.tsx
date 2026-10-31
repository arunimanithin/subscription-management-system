import { PageHeader } from "@/components/shared/page-header";
import { CustomersScreen } from "@/features/auth-data/components/customers-screen";

export default function CustomersPage() {
  return (
    <>
      <PageHeader title="Customers" description="Customer directory. Add, edit and find the businesses you bill." />
      <CustomersScreen />
    </>
  );
}
