"use client";

import { useEffect, useState } from "react";
import type { StatsResponse } from "@/lib/schema";
import { Card, Segmented } from "../ui";

export function StatsTab() {
  const [days, setDays] = useState<"7" | "30" | "90">("7");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/stats?days=${days}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(false);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [days]);

  return (
    <div className="space-y-4">
      <Segmented
        value={days}
        options={[
          { value: "7", label: "7일" },
          { value: "30", label: "30일" },
          { value: "90", label: "90일" },
        ]}
        onChange={setDays}
      />
      {error && <p className="text-sm text-red-600">통계를 불러오지 못했어요.</p>}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="조회" value={data.totals.views.toLocaleString()} />
            <Stat label="클릭" value={data.totals.clicks.toLocaleString()} />
            <Stat label="CTR" value={`${(data.totals.ctr * 100).toFixed(1)}%`} />
          </div>

          <Card title="일별 추이">
            <LineChart daily={data.daily} />
            <div className="flex gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-neutral-900" />조회</span>
              <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 bg-orange-500" />클릭</span>
            </div>
          </Card>

          <Card title="블록별 클릭">
            {data.blocks.length === 0 ? (
              <p className="text-sm text-neutral-500">아직 클릭이 없어요.</p>
            ) : (
              <BlockTable rows={data.blocks} />
            )}
          </Card>

          {data.products.length > 0 && (
            <Card title="상품별 클릭">
              <RankList rows={data.products.map((p) => ({ key: p.productId, label: `${p.no !== null ? `No.${p.no} ` : ""}${p.title ?? "(삭제된 상품)"}`, value: p.clicks }))} initial={20} />
            </Card>
          )}

          {data.categories.length > 0 && (
            <Card title="카테고리별 클릭">
              <RankList rows={data.categories.map((c, i) => ({ key: `${c.categoryId}-${i}`, label: c.name, value: c.clicks }))} initial={20} />
            </Card>
          )}

          <Card title="검색어">
            {data.searches.length === 0 ? (
              <p className="text-sm text-neutral-500">아직 검색이 없어요.</p>
            ) : (
              <TermList rows={data.searches} />
            )}
          </Card>

          <Card title="결과 없는 검색어">
            <p className="text-xs text-neutral-500">방문자가 찾았지만 없던 상품이에요. 다음 상품 아이디어로 써 보세요.</p>
            {data.misses.length === 0 ? <p className="text-sm text-neutral-500">아직 없어요.</p> : <TermList rows={data.misses} />}
          </Card>

          <Card title="유입 경로">
            {data.referrers.length === 0 ? (
              <p className="text-sm text-neutral-500">아직 데이터가 없어요.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.referrers.map((r) => (
                  <li key={r.source} className="flex justify-between">
                    <span>{r.source === "direct" ? "직접 방문" : r.source}</span>
                    <span className="tabular-nums text-neutral-500">{r.views}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="text-xs text-neutral-500">
            조회는 브라우저 세션당 1회로 셉니다(순방문자 수가 아니에요). 로그인한 상태의 내 방문·클릭과 봇은 집계하지 않아요. 날짜는 한국 시간 기준이에요.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function BlockTable({ rows }: { rows: StatsResponse["blocks"] }) {
  const merged: { key: string; title: string; clicks: number }[] = [];
  let deleted = 0;
  for (const r of rows) {
    if (r.type === null) deleted += r.clicks;
    else merged.push({ key: r.blockId, title: r.title ?? "(제목 없음)", clicks: r.clicks });
  }
  if (deleted) merged.push({ key: "__deleted", title: "(삭제된 블록)", clicks: deleted });
  merged.sort((a, b) => b.clicks - a.clicks);
  const max = Math.max(...merged.map((m) => m.clicks), 1);
  return (
    <ul className="space-y-2.5">
      {merged.map((m) => (
        <li key={m.key} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="truncate pr-3">{m.title}</span>
            <span className="tabular-nums text-neutral-500">{m.clicks}</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100">
            <div className="h-1.5 rounded-full bg-neutral-900" style={{ width: `${(m.clicks / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function LineChart({ daily }: { daily: StatsResponse["daily"] }) {
  const W = 500;
  const H = 160;
  const P = 24;
  const max = Math.max(1, ...daily.map((d) => Math.max(d.views, d.clicks)));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, daily.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = (key: "views" | "clicks") => daily.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="일별 조회와 클릭 추이">
      <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#e5e5e5" />
      <text x={P} y={14} fontSize="11" fill="#a3a3a3">{max}</text>
      <text x={P} y={H - 6} fontSize="11" fill="#a3a3a3">{daily[0]?.date.slice(5)}</text>
      <text x={W - P} y={H - 6} fontSize="11" fill="#a3a3a3" textAnchor="end">{daily.at(-1)?.date.slice(5)}</text>
      <path d={path("views")} fill="none" stroke="#171717" strokeWidth="2" strokeLinejoin="round" />
      <path d={path("clicks")} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function RankList({ rows, initial }: { rows: { key: string; label: string; value: number }[]; initial: number }) {
  const [all, setAll] = useState(false);
  const max = Math.max(...rows.map((r) => r.value), 1);
  const shown = all ? rows : rows.slice(0, initial);
  return (
    <>
      <ul className="space-y-2.5">
        {shown.map((r) => (
          <li key={r.key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate pr-3">{r.label}</span>
              <span className="tabular-nums text-neutral-500">{r.value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100">
              <div className="h-1.5 rounded-full bg-neutral-900" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {rows.length > initial && !all && (
        <button className="text-xs text-neutral-500 underline" onClick={() => setAll(true)}>
          더 보기 ({rows.length - initial}개)
        </button>
      )}
    </>
  );
}

function TermList({ rows }: { rows: { q: string; count: number }[] }) {
  return (
    <ol className="space-y-1.5 text-sm">
      {rows.map((r, i) => (
        <li key={r.q} className="flex justify-between gap-3">
          <span className="truncate">
            <span className="mr-2 inline-block w-5 text-right tabular-nums text-neutral-400">{i + 1}</span>
            {r.q}
          </span>
          <span className="tabular-nums text-neutral-500">{r.count}</span>
        </li>
      ))}
    </ol>
  );
}
