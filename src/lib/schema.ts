import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 해요");

export const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

export function isSafeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return ALLOWED_PROTOCOLS.includes(u.protocol);
  } catch {
    return false;
  }
}

const url = z
  .string()
  .trim()
  .min(1, "URL을 입력해 주세요")
  .refine(isSafeUrl, "http(s), mailto, tel 주소만 쓸 수 있어요");

/** 업로드 파일(/media/...) 또는 외부 http(s) 이미지 */
const imageSrc = z
  .string()
  .refine((v) => v.startsWith("/media/") || /^https?:\/\//.test(v), "이미지 주소가 올바르지 않아요");

const id = z.string().min(1).max(40);

export const socialPlatforms = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "threads",
  "github",
  "blog",
  "email",
  "kakao",
  "website",
] as const;

export const SocialLinkSchema = z.object({
  id,
  platform: z.enum(socialPlatforms),
  url,
});

export const ProfileSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(40),
  bio: z.string().max(200),
  avatarUrl: imageSrc.nullable(),
  socials: z.array(SocialLinkSchema).max(10),
  socialsPosition: z.enum(["top", "bottom"]),
});

const blockBase = {
  id,
  visible: z.boolean(),
  schedule: z
    .object({ startAt: z.string().optional(), endAt: z.string().optional() })
    .optional(),
};

export const LinkBlockSchema = z.object({
  ...blockBase,
  type: z.literal("link"),
  title: z.string().trim().min(1, "제목을 입력해 주세요").max(60),
  url,
  description: z.string().max(80).optional(),
  thumbnail: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("image"), url: imageSrc }),
      z.object({ kind: z.literal("emoji"), value: z.string().min(1).max(16) }),
    ])
    .optional(),
  chips: z.array(z.string().trim().min(1).max(12)).max(2).optional(),
  highlight: z.boolean(),
  animation: z.enum(["none", "wiggle", "pulse"]),
  openInNewTab: z.boolean(),
});

export const ImageCardBlockSchema = z.object({
  ...blockBase,
  type: z.literal("imageCard"),
  imageUrl: imageSrc,
  imageAlt: z.string().max(120),
  aspect: z.enum(["16:9", "1:1", "4:5"]),
  title: z.string().max(60),
  description: z.string().max(120).optional(),
  url,
  highlight: z.boolean(),
  openInNewTab: z.boolean(),
});

export const HeaderBlockSchema = z.object({
  ...blockBase,
  type: z.literal("header"),
  text: z.string().trim().min(1, "텍스트를 입력해 주세요").max(60),
  align: z.enum(["left", "center"]),
});

export const DividerBlockSchema = z.object({
  ...blockBase,
  type: z.literal("divider"),
  style: z.enum(["line", "dots", "space"]),
});

export const YoutubeBlockSchema = z.object({
  ...blockBase,
  type: z.literal("youtube"),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, "유튜브 주소를 확인해 주세요"),
  format: z.enum(["video", "shorts"]),
  title: z.string().max(60).optional(),
});

export const BlockSchema = z.discriminatedUnion("type", [
  LinkBlockSchema,
  ImageCardBlockSchema,
  HeaderBlockSchema,
  DividerBlockSchema,
  YoutubeBlockSchema,
]);

export const fontKeys = [
  "system",
  "pretendard",
  "notoSansKr",
  "gowunDodum",
  "nanumMyeongjo",
  "ibmPlexSansKr",
] as const;

export const ThemeSchema = z.object({
  presetId: z.string().nullable(),
  background: z.discriminatedUnion("type", [
    z.object({ type: z.literal("solid"), color: hex }),
    z.object({
      type: z.literal("gradient"),
      from: hex,
      to: hex,
      angle: z.number().min(0).max(360),
    }),
    z.object({ type: z.literal("image"), url: imageSrc, dim: z.number().min(0).max(0.8) }),
  ]),
  textColor: hex,
  button: z.object({
    shape: z.enum(["square", "rounded", "pill"]),
    style: z.enum(["fill", "outline", "soft", "hardShadow"]),
    color: hex,
    textColor: hex,
  }),
  accentColor: hex,
  font: z.enum(fontKeys),
});

export const SeoSchema = z.object({
  title: z.string().max(70),
  description: z.string().max(200),
  ogImageUrl: imageSrc.nullable(),
  favicon: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("emoji"), value: z.string().min(1).max(16) }),
    z.object({ kind: z.literal("avatar") }),
  ]),
  allowIndexing: z.boolean(),
});

export const SettingsSchema = z.object({
  showShareButton: z.boolean(),
  showDesktopQr: z.boolean(),
  timezone: z.literal("Asia/Seoul"),
});

// ---- 쇼핑: 카테고리 / 상품 ----
export const MAX_PRODUCTS = 500;
export const MAX_CATEGORIES = 20;
export const DEFAULT_DISCLOSURE =
  "이 페이지의 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

export const CategorySchema = z.object({
  id,
  name: z.string().trim().min(1, "카테고리 이름을 입력해 주세요").max(12),
  emoji: z.string().max(16).optional(),
});

const httpUrl = z
  .string()
  .trim()
  .min(1, "URL을 입력해 주세요")
  .refine((v) => {
    try {
      return ["http:", "https:"].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, "http(s) 주소만 쓸 수 있어요");

export const PRODUCT_ID_RE = /^p_[0-9a-z]{8}$/;

export const ProductSchema = z.object({
  id: z.string().regex(PRODUCT_ID_RE),
  no: z.number().int().min(1).max(99999).nullable(),
  title: z.string().trim().min(1, "상품명을 입력해 주세요").max(60),
  url: httpUrl,
  imageUrl: imageSrc.nullable(),
  priceText: z.string().max(16).optional(),
  badge: z.string().max(8).optional(),
  categoryId: id.nullable(),
  keywords: z.array(z.string().trim().min(1).max(20)).max(10),
  pinned: z.boolean(),
  visible: z.boolean(),
  createdAt: z.string(),
});

export const ShopSchema = z.object({
  enabled: z.boolean(),
  position: z.enum(["top", "bottom"]),
  defaultSort: z.enum(["new", "popular"]),
  disclosure: z.string().max(120),
  nextNo: z.number().int().min(1),
  categories: z.array(CategorySchema).max(MAX_CATEGORIES),
  products: z.array(ProductSchema).max(MAX_PRODUCTS),
});

export function defaultShop(): z.infer<typeof ShopSchema> {
  return {
    enabled: true,
    position: "top",
    defaultSort: "new",
    disclosure: DEFAULT_DISCLOSURE,
    nextNo: 1,
    categories: [],
    products: [],
  };
}

export const SiteDocSchema = z.object({
  schemaVersion: z.literal(2),
  rev: z.number().int().min(0),
  updatedAt: z.string(),
  profile: ProfileSchema,
  blocks: z.array(BlockSchema).max(200),
  theme: ThemeSchema,
  seo: SeoSchema,
  settings: SettingsSchema,
  shop: ShopSchema,
}).superRefine((doc, ctx) => {
  const ids = new Set(doc.shop.categories.map((c) => c.id));
  const names = new Set<string>();
  doc.shop.categories.forEach((c, i) => {
    const key = c.name.trim();
    if (names.has(key)) ctx.addIssue({ code: "custom", path: ["shop", "categories", i, "name"], message: "같은 이름의 카테고리가 있어요" });
    names.add(key);
  });
  doc.shop.products.forEach((p, i) => {
    if (p.categoryId !== null && !ids.has(p.categoryId))
      ctx.addIssue({ code: "custom", path: ["shop", "products", i, "categoryId"], message: "없는 카테고리예요" });
  });
});

export const DailyStatSchema = z.object({
  date: z.string(),
  views: z.number(),
  clicks: z.record(z.string(), z.number()),
  referrers: z.record(z.string(), z.number()),
  searches: z.record(z.string(), z.number()).default({}),
  misses: z.record(z.string(), z.number()).default({}),
});

export const StatsDocSchema = z.object({
  schemaVersion: z.literal(1),
  days: z.record(z.string(), DailyStatSchema),
});

export type SiteDoc = z.infer<typeof SiteDocSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type SocialLink = z.infer<typeof SocialLinkSchema>;
export type SocialPlatform = (typeof socialPlatforms)[number];
export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block["type"];
export type LinkBlock = z.infer<typeof LinkBlockSchema>;
export type ImageCardBlock = z.infer<typeof ImageCardBlockSchema>;
export type HeaderBlock = z.infer<typeof HeaderBlockSchema>;
export type DividerBlock = z.infer<typeof DividerBlockSchema>;
export type YoutubeBlock = z.infer<typeof YoutubeBlockSchema>;
export type ClickableBlock = LinkBlock | ImageCardBlock;
export type Theme = z.infer<typeof ThemeSchema>;
export type FontKey = (typeof fontKeys)[number];
export type Seo = z.infer<typeof SeoSchema>;
export type DailyStat = z.infer<typeof DailyStatSchema>;
export type StatsDoc = z.infer<typeof StatsDocSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Shop = z.infer<typeof ShopSchema>;

export interface StatsResponse {
  range: { from: string; to: string; days: number };
  totals: { views: number; clicks: number; ctr: number };
  daily: { date: string; views: number; clicks: number }[];
  blocks: { blockId: string; title: string | null; type: string | null; clicks: number }[];
  referrers: { source: string; views: number }[];
  products: { productId: string; no: number | null; title: string | null; clicks: number }[];
  categories: { categoryId: string | null; name: string; clicks: number }[];
  searches: { q: string; count: number }[];
  misses: { q: string; count: number }[];
}

export function isClickable(b: Block): b is ClickableBlock {
  return b.type === "link" || b.type === "imageCard";
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export function newProductId(): string {
  const hex = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
    : Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return `p_${hex}`;
}
