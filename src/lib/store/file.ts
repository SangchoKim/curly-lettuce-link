import "server-only";
import { promises as fs, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { StatsDocSchema, type DailyStat, type SiteDoc, type StatsDoc } from "../schema";
import { parseSite } from "../migrate";
import { seedSite, seedStats } from "../seed";
import { dateRange } from "../dates";
import { RevConflictError, type MediaStore, type SiteStore, type StatsStore } from "./types";

const DATA_DIR = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATA_DIR || "./data");
const SITE_FILE = path.join(DATA_DIR, "site.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

async function atomicWrite(file: string, data: string | Uint8Array) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, file);
}

async function readJson<T>(file: string, parse: (v: unknown) => T, seed: () => T): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      const s = seed();
      await atomicWrite(file, JSON.stringify(s, null, 2));
      return s;
    }
    throw e;
  }
  try {
    return parse(JSON.parse(raw));
  } catch (err) {
    // 손상된 파일은 보존하고 시드로 복구
    const broken = file.replace(/\.json$/, `.broken-${Date.now()}.json`);
    await fs.rename(file, broken).catch(() => {});
    console.error(`[mylink] ${path.basename(file)} 파싱 실패 → ${path.basename(broken)}로 보존하고 시드로 복구`, err);
    const s = seed();
    await atomicWrite(file, JSON.stringify(s, null, 2));
    return s;
  }
}

/** 프로세스 내 직렬 큐 */
function createQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    const next = tail.then(fn, fn);
    tail = next.catch(() => {});
    return next;
  };
}

function parseSiteOrThrow(v: unknown): SiteDoc {
  const r = parseSite(v);
  if (!r.success) throw r.error;
  return r.data;
}

const MAX_SEARCH_KEYS = 300;

class FileSiteStore implements SiteStore {
  private queue = createQueue();
  get() {
    return this.queue(() => readJson(SITE_FILE, parseSiteOrThrow, seedSite));
  }
  save(next: SiteDoc, baseRev: number) {
    return this.queue(async () => {
      const current = await readJson(SITE_FILE, parseSiteOrThrow, seedSite);
      if (current.rev !== baseRev) throw new RevConflictError(current);
      const saved: SiteDoc = { ...next, rev: current.rev + 1, updatedAt: new Date().toISOString() };
      await atomicWrite(SITE_FILE, JSON.stringify(saved, null, 2));
      return saved;
    });
  }
}

class FileStatsStore implements StatsStore {
  private doc: StatsDoc | null = null;
  private loading: Promise<StatsDoc> | null = null;
  private timer: NodeJS.Timeout | null = null;
  private queue = createQueue();

  constructor() {
    const flushNow = () => {
      if (this.doc && this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
        try {
          writeFileSync(STATS_FILE, JSON.stringify(this.doc));
        } catch {}
      }
    };
    process.once("SIGINT", () => { flushNow(); process.exit(0); });
    process.once("SIGTERM", () => { flushNow(); process.exit(0); });
  }

  private load(): Promise<StatsDoc> {
    if (this.doc) return Promise.resolve(this.doc);
    if (!this.loading) {
      this.loading = readJson(STATS_FILE, (v) => StatsDocSchema.parse(v), seedStats).then((d) => {
        this.doc = d;
        return d;
      });
    }
    return this.loading;
  }

  private day(doc: StatsDoc, date: string): DailyStat {
    return (doc.days[date] ??= { date, views: 0, clicks: {}, referrers: {}, searches: {}, misses: {} });
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const snapshot = JSON.stringify(this.doc);
      void this.queue(() => atomicWrite(STATS_FILE, snapshot));
    }, 2000);
  }

  async recordView(date: string, referrer: string) {
    const doc = await this.load();
    const d = this.day(doc, date);
    d.views += 1;
    d.referrers[referrer] = (d.referrers[referrer] ?? 0) + 1;
    this.scheduleFlush();
  }

  async recordClick(date: string, blockId: string) {
    const doc = await this.load();
    const d = this.day(doc, date);
    d.clicks[blockId] = (d.clicks[blockId] ?? 0) + 1;
    this.scheduleFlush();
  }

  async recordSearch(date: string, q: string, hit: boolean) {
    const doc = await this.load();
    const d = this.day(doc, date);
    const map = hit ? (d.searches ??= {}) : (d.misses ??= {});
    if (!(q in map) && Object.keys(map).length >= MAX_SEARCH_KEYS) return;
    map[q] = (map[q] ?? 0) + 1;
    this.scheduleFlush();
  }

  async range(from: string, to: string) {
    const doc = await this.load();
    return dateRange(from, to).map(
      (date) => doc.days[date] ?? { date, views: 0, clicks: {}, referrers: {}, searches: {}, misses: {} },
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

class FileMediaStore implements MediaStore {
  async put(bytes: Uint8Array, contentType: string) {
    const ext = EXT[contentType];
    const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
    const name = `${hash}.${ext}`;
    const file = path.join(UPLOAD_DIR, name);
    try {
      await fs.access(file);
    } catch {
      await atomicWrite(file, bytes);
    }
    return { url: `/media/${name}` };
  }
  async read(name: string) {
    if (!/^[a-f0-9]{16}\.(jpg|png|webp|gif)$/.test(name)) return null;
    try {
      const bytes = await fs.readFile(path.join(UPLOAD_DIR, name));
      return { bytes: new Uint8Array(bytes), contentType: TYPE_BY_EXT[name.split(".")[1]] };
    } catch {
      return null;
    }
  }
}

export function createFileStores() {
  return {
    site: new FileSiteStore(),
    stats: new FileStatsStore(),
    media: new FileMediaStore(),
  };
}
