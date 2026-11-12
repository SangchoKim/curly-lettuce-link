/** watch / youtu.be / shorts / embed / live URL 또는 11자 ID에서 영상 ID와 형식을 뽑는다 */
export function parseYoutube(input: string): { videoId: string; format: "video" | "shorts" } | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return { videoId: s, format: "video" };
  let u: URL;
  try {
    u = new URL(s.startsWith("http") ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  let format: "video" | "shorts" = "video";
  if (host === "youtu.be") id = u.pathname.slice(1, 12);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0])) {
      id = parts[1] ?? null;
      if (parts[0] === "shorts") format = "shorts";
    }
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return { videoId: id, format };
}
