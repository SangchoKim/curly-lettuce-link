import { stores } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/media/[name]">) {
  const { name } = await ctx.params;
  const file = await stores.media.read(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.bytes as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      // 파일명이 내용 해시라 CDN에도 영구 캐시
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
