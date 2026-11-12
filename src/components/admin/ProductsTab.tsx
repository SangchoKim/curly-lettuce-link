"use client";

import { useMemo, useRef, useState } from "react";
import { DEFAULT_DISCLOSURE, MAX_PRODUCTS, ProductSchema, newProductId, type Product, type SiteDoc } from "@/lib/schema";
import { buildIndex, searchScores } from "@/lib/search";
import { bumpNextNo } from "@/lib/shop";
import { useEditor } from "./Editor";
import { CategoryManager } from "./CategoryManager";
import { ProductFields, type ProductDraft } from "./ProductForm";
import { Card, Field, Segmented, Switch, TextArea, TextInput, ToggleRow, btn } from "../ui";

const LIST_PAGE = 50;

export function ProductsTab() {
  return (
    <div className="space-y-4">
      <ShopSettingsCard />
      <Collapsible title="카테고리" defaultOpen={false}>
        <CategoryManager />
      </Collapsible>
      <QuickAdd />
      <ProductList />
    </div>
  );
}

function Collapsible({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card
      title={title}
      right={
        <button className="text-xs text-neutral-500" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "접기" : "펼치기"}
        </button>
      }
    >
      {open && children}
    </Card>
  );
}

function ShopSettingsCard() {
  const { site, update } = useEditor();
  const shop = site.shop;
  const set = (p: Partial<SiteDoc["shop"]>) => update((s) => ({ ...s, shop: { ...s.shop, ...p } }));
  return (
    <Collapsible title="상품 영역 설정" defaultOpen={false}>
      <ToggleRow label="상품 영역 사용" desc="끄면 공개 페이지에 상품이 보이지 않아요" checked={shop.enabled} onChange={(v) => set({ enabled: v })} />
      <Field label="위치">
        <Segmented
          value={shop.position}
          options={[
            { value: "top", label: "링크 위" },
            { value: "bottom", label: "링크 아래" },
          ]}
          onChange={(v) => set({ position: v })}
        />
      </Field>
      <Field label="기본 정렬">
        <Segmented
          value={shop.defaultSort}
          options={[
            { value: "new", label: "최신순" },
            { value: "popular", label: "인기순" },
          ]}
          onChange={(v) => set({ defaultSort: v })}
        />
      </Field>
      <Field label="제휴 고지 문구" hint={`${shop.disclosure.length}/120`}>
        <TextArea value={shop.disclosure} maxLength={120} onChange={(e) => set({ disclosure: e.target.value })} />
      </Field>
      <div className="flex items-center justify-between gap-3">
        {!shop.disclosure.trim() ? (
          <p className="text-xs text-amber-700">제휴 링크가 있다면 고지 문구가 필요해요.</p>
        ) : (
          <span />
        )}
        <button className={btn.small} onClick={() => set({ disclosure: DEFAULT_DISCLOSURE })}>
          기본 문구로 되돌리기
        </button>
      </div>
    </Collapsible>
  );
}

function emptyDraft(categoryId: string | null, no: number): ProductDraft {
  return { no, title: "", url: "", imageUrl: null, categoryId, keywords: [] };
}

function QuickAdd() {
  const { site, update, toast } = useEditor();
  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft(null, site.shop.nextNo));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const full = site.shop.products.length >= MAX_PRODUCTS;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || full) return;
    const product: Product = {
      ...draft,
      id: newProductId(),
      createdAt: new Date().toISOString(),
      visible: true,
      pinned: false,
    } as Product;
    const r = ProductSchema.safeParse(product);
    const errs: Record<string, string> = {};
    if (!r.success) for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
    if (product.categoryId && !site.shop.categories.some((c) => c.id === product.categoryId)) errs.categoryId = "없는 카테고리예요";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const saved = r.data!;
    const nextNo = bumpNextNo(site.shop, saved.no);
    update((s) => ({
      ...s,
      shop: { ...s.shop, products: [saved, ...s.shop.products], nextNo: bumpNextNo(s.shop, saved.no) },
    }));
    setErrors({});
    setDraft(emptyDraft(draft.categoryId, nextNo)); // 카테고리 유지, 번호는 다음 값
    toast(saved.no !== null ? `No.${saved.no} 추가했어요` : "상품을 추가했어요");
    urlRef.current?.focus();
  }

  return (
    <Card title="상품 빠른 등록" right={<span className="text-xs text-neutral-400">{site.shop.products.length}/{MAX_PRODUCTS}</span>}>
      <form onSubmit={submit} className="space-y-3">
        <ProductFields
          value={draft}
          onChange={(p) => {
            setDraft((d) => ({ ...d, ...p }));
            setErrors((er) => {
              const next = { ...er };
              for (const k of Object.keys(p)) delete next[k];
              return next;
            });
          }}
          errors={errors}
          onBusyChange={setBusy}
          urlInputRef={urlRef}
        />
        <button type="submit" className={`${btn.primary} w-full`} disabled={busy || full}>
          {full ? `최대 ${MAX_PRODUCTS}개까지 등록할 수 있어요` : busy ? "이미지 올리는 중…" : "추가 (Enter)"}
        </button>
      </form>
    </Card>
  );
}

function ProductList() {
  const { site, update, toast, clicks7, issues } = useEditor();
  const products = site.shop.products;
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "hidden" | "pinned">("all");
  const [limit, setLimit] = useState(LIST_PAGE);
  const [openId, setOpenId] = useState<string | null>(null);

  const catById = useMemo(() => new Map(site.shop.categories.map((c) => [c.id, c])), [site.shop.categories]);
  const index = useMemo(
    () =>
      buildIndex(
        products.map((p) => ({ id: p.id, no: p.no, title: p.title, keywords: p.keywords, categoryName: p.categoryId ? catById.get(p.categoryId)?.name : undefined })),
      ),
    [products, catById],
  );
  const scores = useMemo(() => searchScores(index, q), [index, q]);

  const filtered = useMemo(() => {
    let list = products;
    if (catFilter === "none") list = list.filter((p) => !p.categoryId);
    else if (catFilter !== "all") list = list.filter((p) => p.categoryId === catFilter);
    if (status === "hidden") list = list.filter((p) => !p.visible);
    if (status === "pinned") list = list.filter((p) => p.pinned);
    if (scores) list = list.filter((p) => scores.has(p.id)).sort((a, b) => scores.get(a.id)! - scores.get(b.id)!);
    else list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [products, catFilter, status, scores]);

  const patch = (id: string, p: Partial<Product>) =>
    update((s) => ({ ...s, shop: { ...s.shop, products: s.shop.products.map((x) => (x.id === id ? { ...x, ...p } : x)) } }));

  function remove(id: string) {
    let snapshot: Product[] = [];
    update((s) => {
      snapshot = s.shop.products;
      return { ...s, shop: { ...s.shop, products: s.shop.products.filter((p) => p.id !== id) } };
    });
    toast("상품을 삭제했어요", { label: "되돌리기", run: () => update((s) => ({ ...s, shop: { ...s.shop, products: snapshot } })) });
  }

  function duplicate(id: string) {
    update((s) => {
      if (s.shop.products.length >= MAX_PRODUCTS) return s;
      const src = s.shop.products.find((p) => p.id === id)!;
      const copy: Product = { ...structuredClone(src), id: newProductId(), createdAt: new Date().toISOString() };
      return { ...s, shop: { ...s.shop, products: [copy, ...s.shop.products] } };
    });
  }

  const indexOf = new Map(products.map((p, i) => [p.id, i]));

  return (
    <Card title="상품 목록" right={<span className="text-xs text-neutral-400">{filtered.length}개</span>}>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <TextInput value={q} placeholder="상품명·번호·초성 검색" onChange={(e) => { setQ(e.target.value); setLimit(LIST_PAGE); }} aria-label="상품 검색" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-10 rounded-xl border border-neutral-300 bg-white px-2 text-sm" aria-label="카테고리 필터">
          <option value="all">전체 카테고리</option>
          <option value="none">미분류</option>
          {site.shop.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji ? `${c.emoji} ` : ""}
              {c.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-10 rounded-xl border border-neutral-300 bg-white px-2 text-sm" aria-label="상태 필터">
          <option value="all">전체 상태</option>
          <option value="hidden">숨김</option>
          <option value="pinned">고정</option>
        </select>
      </div>

      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">아직 상품이 없어요. 위에서 첫 상품을 등록해 보세요.</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">조건에 맞는 상품이 없어요.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.slice(0, limit).map((p) => {
            const i = indexOf.get(p.id)!;
            const errs: Record<string, string | undefined> = {};
            for (const [k, v] of issues) if (k.startsWith(`shop.products.${i}.`)) errs[k.split(".")[3]] = v;
            const hasErr = Object.keys(errs).length > 0;
            const cat = p.categoryId ? catById.get(p.categoryId) : null;
            const open = openId === p.id;
            return (
              <li key={p.id} className={`rounded-2xl border bg-white ${hasErr ? "border-amber-400" : "border-neutral-200"} ${!p.visible ? "opacity-60" : ""}`}>
                <div className="flex min-h-14 items-center gap-2 px-2">
                  <button className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left" onClick={() => setOpenId(open ? null : p.id)} aria-expanded={open}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-10 w-10 flex-none rounded-lg border border-neutral-200 object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-neutral-100 text-sm">{cat?.emoji ?? "🛍️"}</span>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        {p.no !== null && <span className="flex-none rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold text-white">No.{p.no}</span>}
                        <span className="truncate text-sm font-medium">{p.title}</span>
                      </span>
                      <span className="block truncate text-xs text-neutral-400">
                        {cat ? `${cat.emoji ?? ""} ${cat.name}` : "미분류"}
                        {p.priceText ? ` · ${p.priceText}` : ""}
                        {hasErr ? " · 입력 필요" : ""}
                      </span>
                    </span>
                  </button>
                  <span className="flex-none text-xs text-neutral-400" title="최근 7일 클릭">
                    {clicks7[p.id] ?? 0}회
                  </span>
                  <button
                    className={`grid h-9 w-9 flex-none place-items-center rounded-lg text-base ${p.pinned ? "" : "opacity-25 grayscale hover:opacity-60"}`}
                    onClick={() => patch(p.id, { pinned: !p.pinned })}
                    aria-label="맨 앞에 고정"
                    aria-pressed={p.pinned}
                  >
                    📌
                  </button>
                  <Switch checked={p.visible} onChange={(v) => patch(p.id, { visible: v })} label="공개 페이지에 노출" />
                  <RowMenu onDuplicate={() => duplicate(p.id)} onDelete={() => remove(p.id)} />
                </div>
                {open && (
                  <div className="space-y-3 border-t border-neutral-100 p-4">
                    <ProductFields value={p} onChange={(x) => patch(p.id, x)} errors={errs} onBusyChange={() => {}} selfId={p.id} />
                    <p className="text-xs text-neutral-400">등록일 {new Date(p.createdAt).toLocaleString("ko-KR")}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {filtered.length > limit && (
        <button className={`${btn.ghost} w-full`} onClick={() => setLimit((l) => l + LIST_PAGE)}>
          더 보기 ({filtered.length - limit}개 남음)
        </button>
      )}
    </Card>
  );
}

function RowMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-none">
      <button className="grid h-9 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={() => setOpen((v) => !v)} aria-label="더보기">
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-28 rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-lg" onMouseLeave={() => setOpen(false)}>
          <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-100" onClick={() => { onDuplicate(); setOpen(false); }}>
            복제
          </button>
          <button className="block w-full rounded-lg px-3 py-2 text-left text-red-600 hover:bg-neutral-100" onClick={() => { onDelete(); setOpen(false); }}>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
