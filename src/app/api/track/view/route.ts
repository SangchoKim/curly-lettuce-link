import { stores } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { kstDate } from "@/lib/dates";
import { isBot, normalizeReferrer } from "@/lib/track";

export async function POST(req: Request) {
  try {
    if (!isBot(req.headers.get("user-agent")) && !(await isAdmin())) {
      let ref = "";
      try {
        const body = (await req.json()) as { ref?: unknown };
        if (typeof body.ref === "string") ref = body.ref.slice(0, 500);
      } catch {}
      await stores.stats.recordView(kstDate(), normalizeReferrer(ref, req.headers.get("host")));
    }
  } catch (e) {
    console.error("[mylink] view track failed", e);
  }
  return new Response(null, { status: 204 });
}
