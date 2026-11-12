import type { Category, Product, Shop } from "./schema";

export const NEW_DAYS = 7;
export const PAGE_SIZE = 30;

export type SortKey = "new" | "popular";

/** 공개 페이지로 내려보내는 축약 상품 (제휴 URL 제외) */
export interface PublicProduct {
  id: string;
  no: number | null;
  title: string;
  img: string | null;
  price?: string;
  badge?: string;
  cat: string | null;
  kw: string[];
  t: number; // createdAt epoch 초
  pin: boolean;
  isNew: boolean;
  pop: number; // 최근 30일 클릭
  hidden?: boolean;
}

export interface PublicShop {
  categories: Category[];
  products: PublicProduct[];
  defaultSort: SortKey;
  disclosure: string;
}

export function toPublicShop(
  shop: Shop,
  popularity: Record<string, number>,
  now: number,
  includeHidden = false,
): PublicShop {
  const list = shop.products.filter((p) => p.visible || includeHidden);
  const products: PublicProduct[] = list.map((p) => {
    const t = Math.floor(Date.parse(p.createdAt) / 1000) || 0;
    return {
      id: p.id,
      no: p.no,
      title: p.title,
      img: p.imageUrl,
      price: p.priceText || undefined,
      badge: p.badge || undefined,
      cat: p.categoryId,
      kw: p.keywords,
      t,
      pin: p.pinned,
      isNew: now / 1000 - t < NEW_DAYS * 86400,
      pop: popularity[p.id] ?? 0,
      ...(p.visible ? {} : { hidden: true }),
    };
  });
  const used = new Set(products.map((p) => p.cat));
  return {
    categories: shop.categories.filter((c) => used.has(c.id)),
    products,
    defaultSort: shop.defaultSort,
    disclosure: shop.disclosure,
  };
}

export function compareBy(sort: SortKey) {
  return (a: PublicProduct, b: PublicProduct) =>
    sort === "popular" ? b.pop - a.pop || b.t - a.t : b.t - a.t;
}

/**
 * 필터·정렬 결과. scores가 있으면(검색 중) 점수 → 정렬 순, 없으면 고정 상품 우선 → 정렬 순
 */
export function arrange(
  products: PublicProduct[],
  opts: { cat: string | null; sort: SortKey; scores: Map<string, number> | null },
): PublicProduct[] {
  const cmp = compareBy(opts.sort);
  let list = opts.cat ? products.filter((p) => p.cat === opts.cat) : products;
  if (opts.scores) {
    const s = opts.scores;
    list = list.filter((p) => s.has(p.id));
    return [...list].sort((a, b) => s.get(a.id)! - s.get(b.id)! || cmp(a, b));
  }
  return [...list].sort((a, b) => Number(b.pin) - Number(a.pin) || cmp(a, b));
}

/** 다음 자동 번호 */
export function bumpNextNo(shop: Shop, used: number | null): number {
  return Math.max(shop.nextNo, (used ?? 0) + 1);
}

export function categoryName(shop: { categories: Category[] }, id: string | null): string {
  if (!id) return "미분류";
  return shop.categories.find((c) => c.id === id)?.name ?? "미분류";
}

export function sameNoCount(products: Product[], no: number | null, exceptId?: string) {
  if (no === null) return 0;
  return products.filter((p) => p.no === no && p.id !== exceptId).length;
}
