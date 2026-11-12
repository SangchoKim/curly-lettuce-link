import "server-only";
import { createFileStores } from "./file";
import { createSupabaseStores } from "./supabase";
import type { MediaStore, SiteStore, StatsStore } from "./types";

export { RevConflictError, isRevConflict } from "./types";

type Stores = { site: SiteStore; stats: StatsStore; media: MediaStore };

const g = globalThis as unknown as { __mylinkStores?: Stores };

function create(): Stores {
  const driver = process.env.STORAGE_DRIVER || "file";
  switch (driver) {
    case "file":
      return createFileStores();
    case "supabase":
      return createSupabaseStores();
    default:
      throw new Error(`지원하지 않는 STORAGE_DRIVER: ${driver}`);
  }
}

// 개발 모드 HMR에서도 단일 인스턴스 유지
export const stores: Stores = (g.__mylinkStores ??= create());
