import "server-only";
import type { ZodError } from "zod";
import { isAdmin, sameOrigin } from "./auth";

export function apiError(status: number, code: string, message: string, issues?: ZodError["issues"]) {
  return Response.json({ error: { code, message, ...(issues ? { issues } : {}) } }, { status });
}

/** 관리자 API 공통 가드. 통과하면 null */
export async function guard(req: Request, mutating = false): Promise<Response | null> {
  if (!(await isAdmin())) return apiError(401, "unauthorized", "로그인이 필요해요");
  if (mutating && !sameOrigin(req)) return apiError(403, "bad_origin", "허용되지 않은 출처예요");
  return null;
}
