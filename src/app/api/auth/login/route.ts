import { cookies } from "next/headers";
import { apiError } from "@/lib/api";
import {
  SESSION_COOKIE, authConfigured, checkPassword, clearFailures, createSessionValue,
  recordFailure, sameOrigin, sessionCookieOptions, tooManyAttempts,
} from "@/lib/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return apiError(403, "bad_origin", "허용되지 않은 출처예요");
  if (!authConfigured()) return apiError(503, "not_configured", "ADMIN_PASSWORD와 SESSION_SECRET을 설정해 주세요");
  const key = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (tooManyAttempts(key)) return apiError(429, "too_many_attempts", "잠시 후 다시 시도해 주세요");
  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {}
  if (!checkPassword(password)) {
    recordFailure(key);
    return apiError(401, "invalid_password", "비밀번호가 맞지 않습니다");
  }
  clearFailures(key);
  (await cookies()).set(SESSION_COOKIE, createSessionValue(), sessionCookieOptions);
  return new Response(null, { status: 204 });
}
