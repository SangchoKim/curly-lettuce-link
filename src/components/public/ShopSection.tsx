"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { buildIndex, searchScores } from "@/lib/search";
import { PAGE_SIZE, arrange, compareBy, type PublicProduct, type PublicShop, type SortKey } from "@/lib/shop";

interface Props {
  shop: PublicShop;
  preview: boolean;
  initialQ: string;
  initialC: string | null;
  initialS: SortKey;
}

export function ShopSection({ shop, preview, initialQ, initialC, initialS }: Props) {
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState<string | null>(initialC);
  const [sort, setSort] = useState<SortKey>(initialS);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const deferredQ = useDeferredValue(q);
  const chipsRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const sentSearches = useRef(new Set<string>());

  const catById = useMemo(() => new Map(shop.categories.map((c) => [c.id, c])), [shop.categories]);
  const index = useMemo(
    () =>
      buildIndex(
        shop.products.map((p) => ({
          id: p.id,
          no: p.no,
          title: p.title,
          keywords: p.kw,
          categoryName: p.cat ? catById.get(p.cat)?.name : undefined,
        })),
      ),
    [shop.products, catById],
  );
  const scores = useMemo(() => searchScores(index, deferredQ), [index, deferredQ]);
  const results = useMemo(() => arrange(shop.products, { cat, sort, scores }), [shop.products, cat, sort, scores]);
  const shown = results.slice(0, limit);
  const searching = deferredQ.trim().length > 0;

  // URL 동기화 (replaceState: 서버 재렌더·히스토리 누적 없음). 검색어는 300ms 디바운스
  useEffect(() => {
    if (preview) return;
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
      set("q", q.trim() || null);
      set("c", cat);
      set("s", sort === shop.defaultSort ? null : sort);
      const next = url.pathname + (url.search ? url.search : "") + url.hash;
      if (next !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(window.history.state, "", next);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, cat, sort, preview, shop.defaultSort]);

  // 검색어 집계: 입력이 1.2초 멈추면 1회 (세션 내 같은 검색어 중복 제외)
  const resultCount = results.length;
  useEffect(() => {
    if (preview) return;
    const term = deferredQ.trim().toLowerCase().replace(/\s+/g, " ");
    if (!term || (term.length < 2 && !/^\d+$/.test(term))) return;
    const t = setTimeout(() => {
      if (sentSearches.current.has(term)) return;
      sentSearches.current.add(term);
      const body = JSON.stringify({ q: term, n: resultCount });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track/search", new Blob([body], { type: "application/json" }));
      else fetch("/api/track/search", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [deferredQ, resultCount, preview]);

  function onQuery(v: string) {
    // 검색을 새로 시작하면 카테고리를 '전체'로 (눌러둔 칩 때문에 못 찾는 일 방지)
    if (!q.trim() && v.trim()) setCat(null);
    setQ(v);
    setLimit(PAGE_SIZE);
  }

  /** 목록이 바뀌었을 때 이미 상품 영역 아래로 스크롤해 있었다면 목록 맨 위로 */
  function backToListTop() {
    const el = sectionRef.current;
    if (!el || preview) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
  }

  function pickCat(id: string | null, el?: HTMLElement) {
    setCat(id);
    setLimit(PAGE_SIZE);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    backToListTop();
  }

  function reset() {
    setQ("");
    setCat(null);
    setLimit(PAGE_SIZE);
  }

  const popularPicks = useMemo(
    () => (results.length === 0 ? [...shop.products].sort(compareBy("popular")).slice(0, 6) : []),
    [results.length, shop.products],
  );

  return (
    <section className="ml-shop" aria-label="상품" ref={sectionRef}>
      <div className="ml-shop-sticky">
        <form
          className="ml-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur();
          }}
        >
          <svg className="ml-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={40}
            placeholder="상품명 또는 영상 번호 검색"
            aria-label="상품 검색"
            value={q}
            onChange={(e) => onQuery(e.target.value)}
          />
          {q && (
            <button type="button" className="ml-search-clear" onClick={() => onQuery("")} aria-label="검색어 지우기">
              ×
            </button>
          )}
        </form>

        {shop.categories.length > 0 && (
          <div className="ml-chips-row" ref={chipsRef} role="group" aria-label="카테고리">
            <button type="button" className="ml-catchip" aria-pressed={cat === null} onClick={(e) => pickCat(null, e.currentTarget)}>
              전체
            </button>
            {shop.categories.map((c) => (
              <button key={c.id} type="button" className="ml-catchip" aria-pressed={cat === c.id} onClick={(e) => pickCat(c.id, e.currentTarget)}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {shop.disclosure && (
        <p className="ml-disclosure">
          {shop.disclosure} 가격·재고는 달라질 수 있어요.
        </p>
      )}

      <div className="ml-shop-bar">
        <p aria-live="polite">
          {searching ? (
            <>
              &lsquo;{deferredQ.trim()}&rsquo; 검색 결과 <b>{results.length}</b>개
            </>
          ) : (
            <>
              상품 <b>{results.length}</b>개
            </>
          )}
        </p>
        <div className="ml-sort" role="group" aria-label="정렬">
          {(["new", "popular"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => {
                setSort(s);
                setLimit(PAGE_SIZE);
                backToListTop();
              }}
            >
              {s === "new" ? "최신" : "인기"}
            </button>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="ml-noresult">
          <p>&lsquo;{deferredQ.trim()}&rsquo;에 맞는 상품이 없어요</p>
          <button type="button" className="ml-more" onClick={reset}>
            전체 상품 보기
          </button>
          {popularPicks.length > 0 && (
            <>
              <h3>이런 상품은 어때요</h3>
              <ProductGrid items={popularPicks} preview={preview} catById={catById} />
            </>
          )}
        </div>
      ) : (
        <>
          <ProductGrid items={shown} preview={preview} catById={catById} />
          {results.length > limit && (
            <button type="button" className="ml-more" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              더 보기 ({results.length - limit}개 남음)
            </button>
          )}
        </>
      )}
    </section>
  );
}

function ProductGrid({
  items,
  preview,
  catById,
}: {
  items: PublicProduct[];
  preview: boolean;
  catById: Map<string, { emoji?: string; name: string }>;
}) {
  return (
    <ul className="ml-grid">
      {items.map((p, i) => (
        <li key={p.id}>
          <ProductCard p={p} eager={i < 6} preview={preview} placeholder={(p.cat && catById.get(p.cat)?.emoji) || p.title.charAt(0)} />
        </li>
      ))}
    </ul>
  );
}

function ProductCard({ p, eager, preview, placeholder }: { p: PublicProduct; eager: boolean; preview: boolean; placeholder: string }) {
  const [broken, setBroken] = useState(false);
  const corner = p.badge ?? (p.isNew ? "NEW" : null);
  return (
    <a
      className={`ml-pcard ${p.hidden ? "ml-hidden-block" : ""}`}
      href={preview ? undefined : `/r/${p.id}`}
      rel="sponsored nofollow"
    >
      <span className="ml-pimg">
        {p.img && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.img} alt="" width={300} height={300} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setBroken(true)} />
        ) : (
          <span className="ml-pimg-ph" aria-hidden>
            {placeholder}
          </span>
        )}
        {p.no !== null && <span className="ml-pno">No.{p.no}</span>}
        {corner && <span className="ml-pbadge">{corner}</span>}
      </span>
      <span className="ml-ptitle">{p.title}</span>
      {p.price && <span className="ml-pprice">{p.price}</span>}
    </a>
  );
}
