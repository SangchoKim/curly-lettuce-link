"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SiteDocSchema, type SiteDoc, type StatsResponse } from "@/lib/schema";
import { ProfilePage } from "@/components/public/ProfilePage";
import { BlocksTab } from "./BlocksTab";
import { ProductsTab } from "./ProductsTab";
import { DesignTab } from "./DesignTab";
import { StatsTab } from "./StatsTab";
import { SettingsTab } from "./SettingsTab";
import { ShareModal } from "./ShareModal";
import { btn } from "../ui";

type SaveState = "saved" | "saving" | "dirty" | "error" | "invalid" | "conflict";

interface Ctx {
  site: SiteDoc;
  update: (fn: (s: SiteDoc) => SiteDoc) => void;
  issues: Map<string, string>;
  clicks7: Record<string, number>;
  siteUrl: string;
  toast: (msg: string, action?: { label: string; run: () => void }) => void;
}
const EditorCtx = createContext<Ctx | null>(null);
export function useEditor() {
  const c = useContext(EditorCtx);
  if (!c) throw new Error("EditorCtx missing");
  return c;
}

const TABS = [
  { id: "blocks", label: "블록" },
  { id: "products", label: "상품" },
  { id: "design", label: "디자인" },
  { id: "stats", label: "통계" },
  { id: "settings", label: "설정" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function Editor({
  initialSite,
  siteUrl,
  vercelFileWarning,
}: {
  initialSite: SiteDoc;
  siteUrl: string;
  vercelFileWarning: boolean;
}) {
  const [site, setSite] = useState(initialSite);
  const [now] = useState(() => Date.now());
  const [state, setState] = useState<SaveState>("saved");
  const [tab, setTab] = useState<TabId>("blocks");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [clicks7, setClicks7] = useState<Record<string, number>>({});
  const [toastState, setToastState] = useState<{ msg: string; action?: { label: string; run: () => void } } | null>(null);

  const baseRev = useRef(initialSite.rev);
  const latest = useRef(site);
  const dirty = useRef(false);
  const inflight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsed = useMemo(() => SiteDocSchema.safeParse(site), [site]);
  const issues = useMemo(() => {
    const m = new Map<string, string>();
    if (!parsed.success) for (const i of parsed.error.issues) m.set(i.path.join("."), i.message);
    return m;
  }, [parsed]);

  const toast = useCallback<Ctx["toast"]>((msg, action) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ msg, action });
    toastTimer.current = setTimeout(() => setToastState(null), 5000);
  }, []);

  const saveRef = useRef<() => Promise<void>>(async () => {});
  const save = useCallback(() => saveRef.current(), []);
  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveRef.current(), 800);
  }, []);

  useEffect(() => {
    saveRef.current = async () => {
    if (inflight.current || !dirty.current) return;
    const draft = latest.current;
    const check = SiteDocSchema.safeParse(draft);
    if (!check.success) {
      setState("invalid");
      return;
    }
    inflight.current = true;
    dirty.current = false;
    let stop = false;
    setState("saving");
    try {
      const res = await fetch("/api/site", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ site: draft, baseRev: baseRev.current }),
      });
      if (res.status === 409) {
        dirty.current = true;
        stop = true;
        setState("conflict");
        return;
      }
      if (res.status === 401) {
        stop = true;
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { site: SiteDoc };
      baseRev.current = body.site.rev;
      setState(dirty.current ? "dirty" : "saved");
    } catch {
      dirty.current = true;
      stop = true;
      setState("error");
    } finally {
      inflight.current = false;
      if (dirty.current && !stop) schedule();
    }
    };
  }, [schedule]);

  const update = useCallback(
    (fn: (s: SiteDoc) => SiteDoc) => {
      setSite((prev) => {
        const next = fn(prev);
        latest.current = next;
        return next;
      });
      dirty.current = true;
      setState("dirty");
      schedule();
    },
    [schedule],
  );

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || inflight.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    fetch("/api/stats?days=7")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: StatsResponse | null) => {
        if (s)
          setClicks7(
            Object.fromEntries([
              ...s.blocks.map((b) => [b.blockId, b.clicks] as const),
              ...s.products.map((p) => [p.productId, p.clicks] as const),
            ]),
          );
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const ctx: Ctx = { site, update, issues, clicks7, siteUrl, toast };

  return (
    <EditorCtx.Provider value={ctx}>
      <div className="min-h-dvh bg-neutral-100 text-neutral-900">
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
            <span className="text-base font-extrabold tracking-tight">mylink</span>
            <SaveBadge state={state} issueCount={issues.size} onRetry={save} />
            <div className="ml-auto flex items-center gap-2">
              <a href="/" target="_blank" className={`${btn.small} hidden sm:inline-flex sm:items-center`}>
                내 페이지 보기
              </a>
              <button className={btn.small} onClick={() => setShareOpen(true)}>
                공유
              </button>
              <button className={btn.small} onClick={logout}>
                로그아웃
              </button>
            </div>
          </div>
          <nav className="mx-auto flex max-w-6xl gap-1 px-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`border-b-2 px-3 py-2 text-sm font-semibold transition ${
                  tab === t.id ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {vercelFileWarning && (
          <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
            Vercel에서 파일 저장소를 쓰고 있어요. 편집 내용과 통계가 유지되지 않으니 저장소 어댑터를 먼저 설정하세요.
          </div>
        )}
        {state === "conflict" && (
          <div className="bg-red-50 px-4 py-2 text-center text-xs text-red-800">
            다른 곳에서 수정됐어요.{" "}
            <button className="font-semibold underline" onClick={() => window.location.reload()}>
              새로고침
            </button>
            해서 최신 내용을 불러와 주세요.
          </div>
        )}

        <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6">
          <div className="min-w-0 flex-1 lg:max-w-[560px]">
            {tab === "blocks" && <BlocksTab />}
            {tab === "products" && <ProductsTab />}
            {tab === "design" && <DesignTab />}
            {tab === "stats" && <StatsTab />}
            {tab === "settings" && <SettingsTab />}
          </div>
          <div className="hidden flex-1 justify-center lg:flex">
            <div className="sticky top-28 h-[780px] w-[390px] overflow-hidden rounded-[44px] border-[10px] border-neutral-900 bg-white shadow-2xl">
              <div className="h-full overflow-y-auto">
                <ProfilePage site={site} preview now={now} />
              </div>
            </div>
          </div>
        </div>

        <button
          className="fixed bottom-5 right-5 z-30 h-12 rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white shadow-lg lg:hidden"
          onClick={() => setMobilePreview(true)}
        >
          미리보기
        </button>
        {mobilePreview && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-semibold">미리보기</span>
              <button className={btn.small} onClick={() => setMobilePreview(false)}>
                닫기
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ProfilePage site={site} preview now={now} />
            </div>
          </div>
        )}

        <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} url={siteUrl} />

        {toastState && (
          <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-neutral-900 px-4 py-2.5 text-sm text-white shadow-lg lg:bottom-6">
            <span>{toastState.msg}</span>
            {toastState.action && (
              <button
                className="font-semibold text-amber-300"
                onClick={() => {
                  toastState.action!.run();
                  setToastState(null);
                }}
              >
                {toastState.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </EditorCtx.Provider>
  );
}

function SaveBadge({ state, issueCount, onRetry }: { state: SaveState; issueCount: number; onRetry: () => void }) {
  const map: Record<SaveState, { text: string; cls: string }> = {
    saved: { text: "저장됨", cls: "bg-emerald-50 text-emerald-700" },
    saving: { text: "저장 중…", cls: "bg-neutral-100 text-neutral-600" },
    dirty: { text: "변경됨", cls: "bg-neutral-100 text-neutral-600" },
    error: { text: "저장 실패 — 다시 시도", cls: "bg-red-50 text-red-700 cursor-pointer" },
    invalid: { text: `입력 오류 ${issueCount}건`, cls: "bg-amber-50 text-amber-800" },
    conflict: { text: "충돌", cls: "bg-red-50 text-red-700" },
  };
  const s = state === "dirty" && issueCount > 0 ? map.invalid : map[state];
  return (
    <button type="button" onClick={state === "error" ? onRetry : undefined} className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {s.text}
    </button>
  );
}
