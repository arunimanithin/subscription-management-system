import { SubscriptionDetails } from "@/features/subscriptions";

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubscriptionDetails id={id} />;
}
