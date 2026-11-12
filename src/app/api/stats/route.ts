import { guard } from "@/lib/api";
import { stores } from "@/lib/store";
import { addDays, kstDate } from "@/lib/dates";
import { PRODUCT_ID_RE, type StatsResponse } from "@/lib/schema";

function top(map: Record<string, number>, n: number) {
  return Object.entries(map)
    .map(([q, count]) => ({ q, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const q = Number(new URL(req.url).searchParams.get("days"));
  const days = [7, 30, 90].includes(q) ? q : 7;
  const to = kstDate();
  const from = addDays(to, -(days - 1));
  const [rows, site] = await Promise.all([stores.stats.range(from, to), stores.site.get()]);

  const clickTotals: Record<string, number> = {};
  const refTotals: Record<string, number> = {};
  const searchTotals: Record<string, number> = {};
  const missTotals: Record<string, number> = {};
  let views = 0;
  let clicks = 0;
  const daily = rows.map((r) => {
    const c = Object.values(r.clicks).reduce((a, b) => a + b, 0);
    views += r.views;
    clicks += c;
    for (const [id, n] of Object.entries(r.clicks)) clickTotals[id] = (clickTotals[id] ?? 0) + n;
    for (const [s, n] of Object.entries(r.referrers)) refTotals[s] = (refTotals[s] ?? 0) + n;
    for (const [s, n] of Object.entries(r.searches ?? {})) searchTotals[s] = (searchTotals[s] ?? 0) + n;
    for (const [s, n] of Object.entries(r.misses ?? {})) missTotals[s] = (missTotals[s] ?? 0) + n;
    return { date: r.date, views: r.views, clicks: c };
  });

  const blockById = new Map(site.blocks.map((b) => [b.id, b]));
  const productById = new Map(site.shop.products.map((p) => [p.id, p]));
  const catById = new Map(site.shop.categories.map((c) => [c.id, c]));

  const blocks: StatsResponse["blocks"] = [];
  const products: StatsResponse["products"] = [];
  const catTotals = new Map<string | null, { name: string; clicks: number }>();

  for (const [id, n] of Object.entries(clickTotals)) {
    if (PRODUCT_ID_RE.test(id)) {
      const p = productById.get(id);
      products.push({ productId: id, no: p?.no ?? null, title: p?.title ?? null, clicks: n });
      const cat = p?.categoryId ? catById.get(p.categoryId) : undefined;
      const key = cat ? cat.id : null;
      const name = !p ? "(삭제된 상품)" : cat ? `${cat.emoji ? cat.emoji + " " : ""}${cat.name}` : "미분류";
      const k = !p ? "__deleted" : key;
      const cur = catTotals.get(k) ?? { name, clicks: 0 };
      cur.clicks += n;
      catTotals.set(k, cur);
    } else {
      const b = blockById.get(id);
      const title = !b ? null : b.type === "link" ? b.title : b.type === "imageCard" ? b.title || b.imageAlt || "이미지 카드" : null;
      blocks.push({ blockId: id, title, type: b?.type ?? null, clicks: n });
    }
  }

  const res: StatsResponse = {
    range: { from, to, days },
    totals: { views, clicks, ctr: views ? clicks / views : 0 },
    daily,
    blocks: blocks.sort((a, b) => b.clicks - a.clicks),
    referrers: Object.entries(refTotals)
      .map(([source, v]) => ({ source, views: v }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10),
    products: products.sort((a, b) => b.clicks - a.clicks).slice(0, 50),
    categories: [...catTotals.entries()]
      .map(([categoryId, v]) => ({ categoryId: categoryId === "__deleted" ? null : categoryId, name: v.name, clicks: v.clicks }))
      .sort((a, b) => b.clicks - a.clicks),
    searches: top(searchTotals, 20),
    misses: top(missTotals, 20),
  };
  return Response.json(res);
}
