import { notFound } from "next/navigation";
import { CaseDetail } from "@/components/CaseDetail";
import { getCase } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getCase(id);
  if (!item) notFound();
  return <CaseDetail initialCase={item} />;
}
