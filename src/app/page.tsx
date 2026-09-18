import { listCases } from "@/lib/store";
import { CaseList } from "@/components/CaseList";
import { getSession } from "@/lib/auth";
import { getPersistenceStatus } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [cases, viewer] = await Promise.all([listCases(), getSession()]);
  const ephemeral = !getPersistenceStatus().persistent;
  return <CaseList initialCases={cases} viewer={viewer} ephemeral={ephemeral} />;
}
