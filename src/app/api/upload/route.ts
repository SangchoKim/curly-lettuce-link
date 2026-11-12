import { apiError, guard } from "@/lib/api";
import { stores } from "@/lib/store";

const MAX = 5 * 1024 * 1024;

function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return "image/webp";
  return null;
}

export async function POST(req: Request) {
  const denied = await guard(req, true);
  if (denied) return denied;
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX + 64 * 1024) return apiError(413, "too_large", "5MB 이하 이미지만 올릴 수 있어요");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "bad_form", "파일을 읽지 못했어요");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return apiError(400, "no_file", "파일이 없어요");
  if (file.size > MAX) return apiError(413, "too_large", "5MB 이하 이미지만 올릴 수 있어요");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) return apiError(415, "unsupported_type", "JPG, PNG, WEBP, GIF만 올릴 수 있어요");
  const { url } = await stores.media.put(bytes, type);
  return Response.json({ url }, { status: 201 });
}
