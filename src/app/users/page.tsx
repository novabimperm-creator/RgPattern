import { redirect } from "next/navigation";
import { UsersManager } from "@/components/UsersManager";
import { getSession, listPublicUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/");
  return <UsersManager initialUsers={await listPublicUsers()} />;
}
