import { PageHeader } from "@/components/shared/page-header";
import { PlansScreen } from "@/features/auth-data/components/plans-screen";

export default function PlansPage() {
  return (
    <>
      <PageHeader title="Plans" description="Priced plans with billing interval, trial days, setup fee and tax rate." />
      <PlansScreen />
    </>
  );
}
