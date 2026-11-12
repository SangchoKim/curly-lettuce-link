const BOT_RE = /bot|crawler|spider|preview|facebookexternalhit|kakaotalk-scrap|slackbot|discordbot|whatsapp|telegrambot|curl|wget|python-requests|headless/i;

export function isBot(ua: string | null): boolean {
  return !ua || BOT_RE.test(ua);
}

const ALIASES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "instagram.com"],
  [/(^|\.)tiktok\.com$/, "tiktok.com"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube.com"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "x.com"],
  [/(^|\.)threads\.(net|com)$/, "threads.net"],
  [/(^|\.)facebook\.com$/, "facebook.com"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)naver\.com$/, "naver.com"],
  [/(^|\.)kakao\.com$/, "kakao.com"],
];

export function normalizeReferrer(ref: string | null | undefined, selfHost?: string | null): string {
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    if (selfHost && host === selfHost.split(":")[0]) return "direct";
    for (const [re, name] of ALIASES) if (re.test(host)) return name;
    return host.slice(0, 80);
  } catch {
    return "direct";
  }
}
