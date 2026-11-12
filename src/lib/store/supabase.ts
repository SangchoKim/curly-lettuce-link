import "server-only";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DailyStat, SiteDoc } from "../schema";
import { parseSite } from "../migrate";
import { seedSite } from "../seed";
import { dateRange } from "../dates";
import { RevConflictError, type MediaStore, type SiteStore, type StatsStore } from "./types";

const BUCKET = "mylink-media";

/** 파싱 실패 시 시드로 대체하지 않고 오류를 던진다 (시드를 보여주다 실제 데이터를 덮어쓰는 사고 방지) */
function parseOrThrow(raw: unknown): SiteDoc {
  const r = parseSite(raw);
  if (!r.success) {
    console.error("[mylink] 사이트 문서 검증 실패", r.error.issues);
    throw new Error("사이트 문서를 읽지 못했어요. DB의 mylink_site.doc 을 확인해 주세요.");
  }
  return r.data;
}

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL과 SUPABASE_SECRET_KEY를 설정해 주세요");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

class SupabaseSiteStore implements SiteStore {
  constructor(private db: SupabaseClient) {}

  async get(): Promise<SiteDoc> {
    const { data, error } = await this.db.from("mylink_site").select("doc").eq("id", 1).maybeSingle();
    if (error) throw error;
    if (!data) {
      // 첫 실행: 시드 문서를 저장 (동시 요청이 먼저 만들었으면 그 값을 사용)
      const res = await this.rpcSave(seedSite(), 0);
      return res.doc ? parseOrThrow(res.doc) : seedSite();
    }
    return parseOrThrow(data.doc);
  }

  private async rpcSave(doc: SiteDoc, baseRev: number): Promise<{ ok: boolean; doc: SiteDoc | null }> {
    const { data, error } = await this.db.rpc("mylink_save_site", { p_doc: doc, p_base_rev: baseRev });
    if (error) throw error;
    return data as { ok: boolean; doc: SiteDoc | null };
  }

  async save(next: SiteDoc, baseRev: number): Promise<SiteDoc> {
    const res = await this.rpcSave(next, baseRev);
    if (!res.ok) throw new RevConflictError(res.doc ? parseOrThrow(res.doc) : await this.get());
    return parseOrThrow(res.doc);
  }
}

class SupabaseStatsStore implements StatsStore {
  constructor(private db: SupabaseClient) {}

  async recordView(date: string, referrer: string) {
    const { error } = await this.db.rpc("mylink_record_view", { p_date: date, p_ref: referrer });
    if (error) throw error;
  }

  async recordClick(date: string, blockId: string) {
    const { error } = await this.db.rpc("mylink_record_click", { p_date: date, p_block: blockId });
    if (error) throw error;
  }

  async recordSearch(date: string, q: string, hit: boolean) {
    const { error } = await this.db.rpc("mylink_record_search", { p_date: date, p_q: q, p_hit: hit });
    if (error) throw error;
  }

  async range(from: string, to: string): Promise<DailyStat[]> {
    const { data, error } = await this.db
      .from("mylink_daily_stats")
      .select("date, views, clicks, referrers, searches, misses")
      .gte("date", from)
      .lte("date", to);
    if (error) throw error;
    const byDate = new Map((data ?? []).map((r) => [r.date as string, r as DailyStat]));
    return dateRange(from, to).map(
      (date) => byDate.get(date) ?? { date, views: 0, clicks: {}, referrers: {}, searches: {}, misses: {} },
    );
  }
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT).map(([k, v]) => [v, k]));

class SupabaseMediaStore implements MediaStore {
  constructor(private db: SupabaseClient) {}

  async put(bytes: Uint8Array, contentType: string) {
    const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
    const name = `${hash}.${EXT[contentType]}`;
    const { error } = await this.db.storage.from(BUCKET).upload(name, bytes, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });
    // 같은 내용(같은 해시)이 이미 있으면 그대로 사용
    if (error && !/exists|duplicate/i.test(error.message)) throw error;
    return { url: `/media/${name}` };
  }

  async read(name: string) {
    if (!/^[a-f0-9]{16}\.(jpg|png|webp|gif)$/.test(name)) return null;
    const { data, error } = await this.db.storage.from(BUCKET).download(name);
    if (error || !data) return null;
    return { bytes: new Uint8Array(await data.arrayBuffer()), contentType: TYPE_BY_EXT[name.split(".")[1]] };
  }
}

export function createSupabaseStores() {
  const db = client();
  return {
    site: new SupabaseSiteStore(db),
    stats: new SupabaseStatsStore(db),
    media: new SupabaseMediaStore(db),
  };
}
