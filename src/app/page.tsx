import { listCases } from "@/lib/store";
import { CaseList } from "@/components/CaseList";
import { requirePageAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requirePageAuth();
  const cases = await listCases();
  return <CaseList initialCases={cases} />;
}
