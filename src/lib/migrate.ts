import { SiteDocSchema, defaultShop } from "./schema";

/** 저장된 문서를 최신 schemaVersion 형태로 변환 (DB에는 다시 쓰지 않음) */
export function migrateSite(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const doc = raw as { schemaVersion?: number };
  if (doc.schemaVersion === 1) return { ...doc, schemaVersion: 2, shop: defaultShop() };
  return raw;
}

export function parseSite(raw: unknown) {
  return SiteDocSchema.safeParse(migrateSite(raw));
}
