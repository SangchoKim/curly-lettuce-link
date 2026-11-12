"use client";

/** 클라이언트에서 리사이즈(WebP) 후 /api/upload 로 업로드. GIF는 원본 유지 */
export async function uploadImage(
  file: File,
  opts: { square?: number; maxSide?: number; quality?: number } = {},
): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error("JPG, PNG, WEBP, GIF만 올릴 수 있어요");
  let blob: Blob = file;
  if (file.type !== "image/gif") blob = await resize(file, opts);
  const fd = new FormData();
  fd.append("file", blob, "upload");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? "업로드에 실패했어요");
  return body.url as string;
}

async function resize(
  file: File,
  { square, maxSide = 1600, quality = 0.85 }: { square?: number; maxSide?: number; quality?: number },
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  let dw: number, dh: number;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
    dw = dh = Math.min(square, side);
  } else {
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    dw = Math.round(sw * scale);
    dh = Math.round(sh * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 변환하지 못했어요"))), "image/webp", quality),
  );
}
