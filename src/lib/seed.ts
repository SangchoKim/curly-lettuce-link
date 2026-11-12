import { defaultShop, type SiteDoc, type StatsDoc } from "./schema";
import { PRESETS } from "./presets";

export function seedSite(): SiteDoc {
  const paper = PRESETS[0];
  return {
    schemaVersion: 2,
    rev: 0,
    updatedAt: new Date().toISOString(),
    profile: {
      name: "내 이름",
      bio: "여기에 한 줄 소개를 적어 보세요.\n/admin 에서 편집할 수 있어요.",
      avatarUrl: null,
      socials: [
        { id: "s1", platform: "instagram", url: "https://instagram.com/" },
        { id: "s2", platform: "youtube", url: "https://youtube.com/" },
      ],
      socialsPosition: "top",
    },
    blocks: [
      { id: "b1", type: "header", visible: true, text: "📌 바로가기", align: "center" },
      {
        id: "b2",
        type: "link",
        visible: true,
        title: "가장 중요한 링크",
        url: "https://example.com",
        highlight: true,
        animation: "wiggle",
        openInNewTab: false,
        chips: ["NEW"],
      },
      {
        id: "b3",
        type: "link",
        visible: true,
        title: "블로그",
        url: "https://example.com/blog",
        thumbnail: { kind: "emoji", value: "✍️" },
        highlight: false,
        animation: "none",
        openInNewTab: false,
      },
      { id: "b4", type: "divider", visible: true, style: "dots" },
    ],
    theme: { ...paper.theme, presetId: paper.id, font: "pretendard" },
    seo: {
      title: "",
      description: "",
      ogImageUrl: null,
      favicon: { kind: "emoji", value: "🔗" },
      allowIndexing: true,
    },
    settings: { showShareButton: true, showDesktopQr: true, timezone: "Asia/Seoul" },
    shop: defaultShop(),
  };
}

export function seedStats(): StatsDoc {
  return { schemaVersion: 1, days: {} };
}
