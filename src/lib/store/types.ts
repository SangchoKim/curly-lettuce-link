import type { DailyStat, SiteDoc } from "../schema";

export class RevConflictError extends Error {
  readonly code = "rev_conflict";
  constructor(public current: SiteDoc) {
    super("rev_conflict");
    this.name = "RevConflictError";
  }
}

/** 번들 청크가 달라도 동작하도록 instanceof 대신 code로 판별 */
export function isRevConflict(e: unknown): e is RevConflictError {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === "rev_conflict";
}

export interface SiteStore {
  get(): Promise<SiteDoc>;
  save(next: SiteDoc, baseRev: number): Promise<SiteDoc>;
}

export interface StatsStore {
  recordView(date: string, referrer: string): Promise<void>;
  recordClick(date: string, blockId: string): Promise<void>;
  recordSearch(date: string, q: string, hit: boolean): Promise<void>;
  range(from: string, to: string): Promise<DailyStat[]>;
}

export interface MediaStore {
  put(bytes: Uint8Array, contentType: string): Promise<{ url: string }>;
  read(name: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
}
