import { getPersistenceStatus } from "@/lib/persistence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const persistence = getPersistenceStatus();
  return Response.json({
    ok: true,
    persistent: persistence.persistent,
    platform: persistence.platform,
  });
}
