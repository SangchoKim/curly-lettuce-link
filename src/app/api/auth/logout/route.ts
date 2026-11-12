import { cookies } from "next/headers";
import { guard } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const denied = await guard(req, true);
  if (denied) return denied;
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
