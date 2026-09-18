import { notFound } from "next/navigation";
import { CaseDetail } from "@/components/CaseDetail";
import { getSession } from "@/lib/auth";
import { getCase } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, viewer] = await Promise.all([getCase(id), getSession()]);
  if (!item) notFound();
  return <CaseDetail initialCase={item} viewer={viewer} />;
}
