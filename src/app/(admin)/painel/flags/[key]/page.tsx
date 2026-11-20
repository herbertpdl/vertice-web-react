import type { Metadata } from "next";
import { FeatureFlagContent } from "./FeatureFlagContent";

export const metadata: Metadata = { title: "Feature flags — Painel Vertice" };

/**
 * One flag: everyone's state and the users with their own setting (feature-flags spec §6.2; frames
 * `gJQrD`, `oONTU`, `MzesP`, `vJYcq`). Next has already decoded the segment; a key that isn't in
 * the list shows "Flag não encontrada".
 */
export default async function AdminFeatureFlagPage({ params }: PageProps<"/painel/flags/[key]">) {
  const { key } = await params;
  return <FeatureFlagContent flagKey={key} />;
}
