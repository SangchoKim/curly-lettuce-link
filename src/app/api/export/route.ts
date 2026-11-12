import { guard } from "@/lib/api";
import { stores } from "@/lib/store";
import { kstDate } from "@/lib/dates";

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  const site = await stores.site.get();
  return new Response(JSON.stringify(site, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mylink-site-${kstDate()}.json"`,
    },
  });
}
