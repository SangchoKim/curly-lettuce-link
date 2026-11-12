import { z } from "zod";
import { apiError, guard } from "@/lib/api";
import { SiteDocSchema } from "@/lib/schema";
import { isRevConflict, stores } from "@/lib/store";

export async function GET(req: Request) {
  const denied = await guard(req);
  if (denied) return denied;
  return Response.json({ site: await stores.site.get() });
}

const PutBody = z.object({ site: SiteDocSchema, baseRev: z.number().int() });

export async function PUT(req: Request) {
  const denied = await guard(req, true);
  if (denied) return denied;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError(400, "bad_json", "JSON 형식이 아니에요");
  }
  const parsed = PutBody.safeParse(json);
  if (!parsed.success) return apiError(422, "validation_failed", "입력값을 확인해 주세요", parsed.error.issues);
  try {
    const site = await stores.site.save(parsed.data.site, parsed.data.baseRev);
    return Response.json({ site });
  } catch (e) {
    if (isRevConflict(e)) {
      return Response.json(
        { error: { code: "rev_conflict", message: "다른 곳에서 수정됐어요" }, current: e.current },
        { status: 409 },
      );
    }
    throw e;
  }
}
