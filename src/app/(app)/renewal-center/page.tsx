import { Suspense } from "react";
import { RenewalCenterSkeleton, RenewalCenterView } from "@/features/intelligence/renewals/renewal-center-view";

export default function RenewalCenterPage() {
  return (
    <Suspense fallback={<RenewalCenterSkeleton />}>
      <RenewalCenterView />
    </Suspense>
  );
}