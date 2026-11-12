import type { Block, SiteDoc } from "@/lib/schema";
import { backgroundCss, googleFontHref, themeToCssVars } from "@/lib/theme";
import { SocialIcon, SOCIAL_LABELS } from "./SocialIcon";
import { ShareButton, ViewBeacon, YoutubeFacade } from "./ClientBits";
import { ShopSection } from "./ShopSection";
import { toPublicShop, type SortKey } from "@/lib/shop";

interface Props {
  site: SiteDoc;
  /** 관리자 미리보기: 링크 이동·비콘 비활성, 숨긴 블록 반투명 */
  preview?: boolean;
  isAdmin?: boolean;
  siteUrl?: string;
  qrSvg?: string | null;
  /** 최근 30일 상품 클릭 수 */
  popularity?: Record<string, number>;
  /** 신상 판정 기준 시각 (ms). 서버/클라이언트 렌더 결과를 맞추기 위해 밖에서 받는다 */
  now?: number;
  initial?: { q: string; c: string | null; s: SortKey | null };
}

export function ProfilePage({
  site,
  preview = false,
  isAdmin = false,
  siteUrl = "",
  qrSvg,
  popularity,
  now = 0,
  initial,
}: Props) {
  const { profile, theme, settings } = site;
  const pubShop = site.shop.enabled ? toPublicShop(site.shop, popularity ?? {}, now, preview) : null;
  const showShop = !!pubShop && pubShop.products.length > 0;
  const shop = showShop && (
    <ShopSection
      shop={pubShop!}
      preview={preview}
      initialQ={initial?.q ?? ""}
      initialC={initial?.c && pubShop!.categories.some((c) => c.id === initial.c) ? initial.c : null}
      initialS={initial?.s ?? pubShop!.defaultSort}
    />
  );
  const blocks = site.blocks.filter((b) => b.visible || preview);
  const visibleCount = site.blocks.filter((b) => b.visible).length;

  const socials = profile.socials.length > 0 && (
    <ul className="ml-socials">
      {profile.socials.map((s) => (
        <li key={s.id}>
          <a
            href={preview ? undefined : s.url}
            aria-label={SOCIAL_LABELS[s.platform]}
            target={s.url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
          >
            <SocialIcon platform={s.platform} />
          </a>
        </li>
      ))}
    </ul>
  );

  const fontHref = googleFontHref([theme.font]);

  return (
    <div className={`ml-root ${preview ? "ml-preview" : ""}`} style={themeToCssVars(theme)}>
      {fontHref && <link rel="stylesheet" href={fontHref} precedence="default" />}
      <div className="ml-bg" style={backgroundCss(theme)} aria-hidden />
      {!preview && <ViewBeacon />}

      <div className="ml-col">
        <div className="ml-topbar">
          {settings.showShareButton ? <ShareButton url={siteUrl} title={profile.name} /> : <span />}
          {isAdmin && !preview && (
            <a className="ml-editlink" href="/admin">
              편집
            </a>
          )}
        </div>

        <header className={`ml-profile ${showShop ? "ml-profile-compact" : ""}`}>
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ml-avatar" src={profile.avatarUrl} alt={profile.name} width={96} height={96} />
          ) : (
            <div className="ml-avatar ml-avatar-initial" aria-hidden>
              {profile.name.trim().charAt(0) || "?"}
            </div>
          )}
          <h1 className="ml-name">{profile.name}</h1>
          {profile.bio && <p className="ml-bio">{profile.bio}</p>}
          {profile.socialsPosition === "top" && socials}
        </header>

        {site.shop.position === "top" && shop}

        {/* 상품이 있으면 블록이 0개여도 빈 안내를 띄우지 않고 블록 영역 자체를 생략 */}
        {(blocks.length > 0 || !showShop) && (
          <main className="ml-blocks">
            {visibleCount === 0 && !preview && !showShop && <p className="ml-empty">아직 공개된 링크가 없어요</p>}
            {blocks.map((b, i) => (
              <div key={b.id} className={`ml-blockwrap ${!b.visible ? "ml-hidden-block" : ""} ${b.type === "header" && i > 0 ? "ml-gap-header" : ""}`}>
                <BlockView block={b} preview={preview} eager={i < 4} />
              </div>
            ))}
          </main>
        )}

        {site.shop.position === "bottom" && shop}

        {profile.socialsPosition === "bottom" && <footer className="ml-footer">{socials}</footer>}
      </div>

      {!preview && settings.showDesktopQr && qrSvg && (
        <aside className="ml-qr" aria-label="모바일로 보기">
          <div className="ml-qr-card" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <span>모바일로 보기</span>
        </aside>
      )}
    </div>
  );
}

function BlockView({ block, preview, eager }: { block: Block; preview: boolean; eager: boolean }) {
  switch (block.type) {
    case "header":
      return <h2 className={`ml-header ml-align-${block.align}`}>{block.text}</h2>;
    case "divider":
      return block.style === "dots" ? (
        <div className="ml-divider-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      ) : block.style === "line" ? (
        <hr className="ml-divider-line" />
      ) : (
        <div className="ml-divider-space" aria-hidden />
      );
    case "youtube":
      return <YoutubeFacade videoId={block.videoId} format={block.format} title={block.title} preview={preview} />;
    case "link": {
      const cls = ["ml-link", block.highlight ? "ml-highlight" : "", block.highlight ? `ml-anim-${block.animation}` : ""].join(" ");
      return (
        <a
          className={cls}
          href={preview ? undefined : `/r/${block.id}`}
          target={block.openInNewTab ? "_blank" : undefined}
          rel={block.openInNewTab ? "noopener noreferrer" : undefined}
        >
          <span className="ml-link-thumb" aria-hidden>
            {block.thumbnail?.kind === "emoji" && <span className="ml-emoji">{block.thumbnail.value}</span>}
            {block.thumbnail?.kind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.thumbnail.url} alt="" width={40} height={40} />
            )}
          </span>
          <span className="ml-link-body">
            {block.chips && block.chips.length > 0 && (
              <span className="ml-chips">
                {block.chips.map((c) => (
                  <span key={c} className="ml-chip">
                    {c}
                  </span>
                ))}
              </span>
            )}
            <span className="ml-link-title">{block.title}</span>
            {block.description && <span className="ml-link-desc">{block.description}</span>}
          </span>
          <span className="ml-link-thumb" aria-hidden />
        </a>
      );
    }
    case "imageCard": {
      const [w, h] = block.aspect.split(":").map(Number);
      return (
        <a
          className={`ml-card ${block.highlight ? "ml-card-highlight" : ""}`}
          href={preview ? undefined : `/r/${block.id}`}
          target={block.openInNewTab ? "_blank" : undefined}
          rel={block.openInNewTab ? "noopener noreferrer" : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.imageUrl}
            alt={block.imageAlt}
            width={w * 100}
            height={h * 100}
            style={{ aspectRatio: `${w} / ${h}` }}
            loading={eager ? "eager" : "lazy"}
          />
          {(block.title || block.description) && (
            <span className="ml-card-body">
              {block.title && <span className="ml-card-title">{block.title}</span>}
              {block.description && <span className="ml-card-desc">{block.description}</span>}
            </span>
          )}
        </a>
      );
    }
  }
}
