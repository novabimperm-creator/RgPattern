import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSession, isAuthConfigured } from "@/lib/auth";
import { getPersistenceStatus } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <AuthForm
      configured={await isAuthConfigured()}
      storageWarning={getPersistenceStatus().message}
    />
  );
}
