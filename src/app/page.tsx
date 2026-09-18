import { listCases } from "@/lib/store";
import { CaseList } from "@/components/CaseList";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [cases, viewer] = await Promise.all([listCases(), getSession()]);
  return <CaseList initialCases={cases} viewer={viewer} />;
}
