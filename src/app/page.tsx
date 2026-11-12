import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import QRCode from "qrcode";
import { stores } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { emojiFavicon, siteUrl } from "@/lib/site-url";
import { addDays, kstDate } from "@/lib/dates";
import { PRODUCT_ID_RE } from "@/lib/schema";
import { ProfilePage } from "@/components/public/ProfilePage";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const site = await stores.site.get();
  const base = siteUrl();
  const title = site.seo.title || site.profile.name;
  const description = site.seo.description || site.profile.bio.split("\n")[0] || "";
  const image = site.seo.ogImageUrl || site.profile.avatarUrl;
  const icon =
    site.seo.favicon.kind === "avatar" && site.profile.avatarUrl
      ? site.profile.avatarUrl
      : emojiFavicon(site.seo.favicon.kind === "emoji" ? site.seo.favicon.value : "🔗");
  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: "/" },
    robots: site.seo.allowIndexing ? undefined : { index: false, follow: false },
    icons: { icon },
    openGraph: {
      type: "profile",
      title,
      description,
      url: "/",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: site.seo.ogImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** 최근 30일 상품 클릭 수 (인기순 정렬용) */
async function productPopularity(): Promise<Record<string, number>> {
  try {
    const to = kstDate();
    const rows = await stores.stats.range(addDays(to, -29), to);
    const out: Record<string, number> = {};
    for (const r of rows)
      for (const [id, n] of Object.entries(r.clicks)) if (PRODUCT_ID_RE.test(id)) out[id] = (out[id] ?? 0) + n;
    return out;
  } catch (e) {
    console.error("[mylink] popularity load failed", e);
    return {};
  }
}

type SP = Record<string, string | string[] | undefined>;
/** 요청 시각 (서버 컴포넌트는 요청마다 한 번 렌더되므로 안전) */
const requestTime = () => Date.now();
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function PublicProfile({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const [site, admin, sp] = await Promise.all([stores.site.get(), isAdmin(), searchParams]);
  const hasProducts = site.shop.enabled && site.shop.products.some((p) => p.visible);
  const popularity = hasProducts ? await productPopularity() : {};
  const url = siteUrl();
  const qrSvg = site.settings.showDesktopQr
    ? await QRCode.toString(url, { type: "svg", margin: 4, color: { dark: "#000000", light: "#ffffff" } })
    : null;
  const s = one(sp.s);
  return (
    <ProfilePage
      site={site}
      isAdmin={admin}
      siteUrl={url}
      qrSvg={qrSvg}
      popularity={popularity}
      now={requestTime()}
      initial={{
        q: (one(sp.q) ?? "").slice(0, 40),
        c: one(sp.c) ?? null,
        s: s === "new" || s === "popular" ? s : null,
      }}
    />
  );
}

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh" }} />}>
      <PublicProfile searchParams={searchParams} />
    </Suspense>
  );
}
