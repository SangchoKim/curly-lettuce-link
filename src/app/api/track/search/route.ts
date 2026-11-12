import { stores } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { kstDate } from "@/lib/dates";
import { isBot } from "@/lib/track";

/** 검색어 집계. 날짜별 "검색어 → 횟수"만 저장 (IP·세션 저장 안 함) */
export async function POST(req: Request) {
  try {
    if (isBot(req.headers.get("user-agent")) || (await isAdmin())) return new Response(null, { status: 204 });
    const body = (await req.json().catch(() => null)) as { q?: unknown; n?: unknown } | null;
    if (!body || typeof body.q !== "string" || typeof body.n !== "number") return new Response(null, { status: 204 });
    const q = body.q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30);
    if (!q) return new Response(null, { status: 204 });
    await stores.stats.recordSearch(kstDate(), q, body.n > 0);
  } catch (e) {
    console.error("[mylink] search track failed", e);
  }
  return new Response(null, { status: 204 });
}
