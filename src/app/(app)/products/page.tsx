import { PageHeader } from "@/components/shared/page-header";
import { ProductsScreen } from "@/features/auth-data/components/products-screen";

export default function ProductsPage() {
  return (
    <>
      <PageHeader title="Products" description="What you sell. Plans (prices and billing cycles) hang off a product." />
      <ProductsScreen />
    </>
  );
}
