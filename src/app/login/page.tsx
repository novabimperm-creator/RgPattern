import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { hasValidSession, isAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await hasValidSession()) redirect("/");
  return <AuthForm configured={await isAuthConfigured()} />;
}
