import { stores } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { PRODUCT_ID_RE, isClickable } from "@/lib/schema";
import { kstDate } from "@/lib/dates";
import { isBot } from "@/lib/track";

function resolveTarget(site: Awaited<ReturnType<typeof stores.site.get>>, id: string): string | null {
  if (PRODUCT_ID_RE.test(id)) {
    if (!site.shop.enabled) return null;
    const p = site.shop.products.find((x) => x.id === id);
    return p && p.visible ? p.url : null;
  }
  const block = site.blocks.find((b) => b.id === id);
  return block && block.visible && isClickable(block) ? block.url : null;
}

export async function GET(req: Request, ctx: RouteContext<"/r/[blockId]">) {
  const { blockId } = await ctx.params;
  const site = await stores.site.get();
  const target = resolveTarget(site, blockId);
  if (!target) return Response.redirect(new URL("/", req.url), 302);
  if (!isBot(req.headers.get("user-agent")) && !(await isAdmin())) {
    try {
      await stores.stats.recordClick(kstDate(), blockId);
    } catch (e) {
      console.error("[mylink] click track failed", e);
    }
  }
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin" },
  });
}
