import { listCases } from "@/lib/store";
import { CaseList } from "@/components/CaseList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cases = await listCases();
  return <CaseList initialCases={cases} />;
}
