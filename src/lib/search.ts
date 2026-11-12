/**
 * 상품 검색 (순수 함수, 공개 페이지·관리자 공용)
 * 순위: 1 영상 번호 일치 → 2 제목 포함 → 3 키워드/카테고리 포함 → 4 초성 일치
 * 한글 조합 중(가→갓→가스→가습)에도 결과가 사라지지 않도록 각 토큰의 마지막 글자는 느슨하게 비교한다.
 */

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
// 종성 인덱스 → 초성 인덱스 (겹받침은 -1)
const JONG_TO_CHO = [-1, 0, 1, -1, 2, -1, -1, 3, 5, -1, -1, -1, -1, -1, -1, -1, 6, 7, -1, 9, 10, 11, 12, 14, 15, 16, 17, 18];

const SBASE = 0xac00;
const SEND = 0xd7a3;

function isSyllable(code: number) {
  return code >= SBASE && code <= SEND;
}

export function norm(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, "");
}

/** 한글 음절은 초성으로, 나머지 글자는 그대로 */
export function choseong(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    out += isSyllable(c) ? CHO[Math.floor((c - SBASE) / 588)] : ch;
  }
  return out;
}

function isChoToken(t: string) {
  return t.length >= 2 && [...t].every((ch) => CHO.includes(ch));
}

/** target 안에 token이 (마지막 글자 느슨 비교로) 들어 있는가 */
export function looseIncludes(target: string, token: string): boolean {
  if (!token) return true;
  if (target.includes(token)) return true;
  const chars = [...token];
  const last = chars.pop()!;
  const head = chars.join("");
  const lc = last.charCodeAt(0);

  // head 바로 뒤 위치들 (head가 비면 모든 위치)
  const candidates: number[] = [];
  if (!head) {
    for (let k = 0; k < target.length; k++) candidates.push(k);
  } else {
    for (let i = target.indexOf(head); i !== -1; i = target.indexOf(head, i + 1)) candidates.push(i + head.length);
  }

  if (isSyllable(lc)) {
    const jong = (lc - SBASE) % 28;
    const base = lc - jong; // 종성을 뗀 음절
    for (const pos of candidates) {
      const c = target.charCodeAt(pos);
      if (!isSyllable(c)) continue;
      if (jong === 0) {
        // '가' → 가/각/갑/갓…
        if (c - ((c - SBASE) % 28) === base) return true;
      } else {
        // '갓' → '가' + 다음 글자 초성 ㅅ ('가습')
        const cho = JONG_TO_CHO[jong];
        if (cho < 0 || c !== base) continue;
        const n = target.charCodeAt(pos + 1);
        if (isSyllable(n) && Math.floor((n - SBASE) / 588) === cho) return true;
      }
    }
    return false;
  }

  const choIdx = CHO.indexOf(last);
  if (choIdx >= 0 && head) {
    // '가ㅅ' → '가' + 초성 ㅅ 음절
    for (const pos of candidates) {
      const c = target.charCodeAt(pos);
      if (isSyllable(c) && Math.floor((c - SBASE) / 588) === choIdx) return true;
    }
  }
  return false;
}

export interface SearchItem {
  id: string;
  no: number | null;
  title: string;
  keywords: string[];
  categoryName?: string;
}

export interface IndexedItem {
  id: string;
  no: number | null;
  t: string; // 제목
  k: string; // 키워드들
  c: string; // 카테고리 이름
  tCho: string;
  kCho: string;
}

export function buildIndex(items: SearchItem[]): IndexedItem[] {
  return items.map((it) => {
    const t = norm(it.title);
    const k = it.keywords.map(norm).join("\u0001");
    return { id: it.id, no: it.no, t, k, c: norm(it.categoryName ?? ""), tCho: choseong(t), kCho: choseong(k) };
  });
}

export function tokenize(q: string): string[] {
  return q
    .slice(0, 40)
    .normalize("NFC")
    .toLowerCase()
    .split(/\s+/)
    .map(norm)
    .filter(Boolean);
}

function tokenRank(it: IndexedItem, tok: string): number {
  if (/^\d+$/.test(tok) && it.no !== null && it.no === Number(tok)) return 1;
  if (looseIncludes(it.t, tok)) return 2;
  if (looseIncludes(it.k, tok) || looseIncludes(it.c, tok)) return 3;
  if (isChoToken(tok) && (it.tCho.includes(tok) || it.kCho.includes(tok))) return 4;
  return Infinity;
}

/** 검색 결과: id → 점수(낮을수록 우선). 매칭 안 된 항목은 포함하지 않음. 검색어가 비면 null */
export function searchScores(index: IndexedItem[], q: string): Map<string, number> | null {
  const tokens = tokenize(q);
  if (!tokens.length) return null;
  const out = new Map<string, number>();
  for (const it of index) {
    let score = 0;
    for (const tok of tokens) {
      const r = tokenRank(it, tok);
      if (r === Infinity) {
        score = Infinity;
        break;
      }
      score = Math.max(score, r);
    }
    if (score !== Infinity) out.set(it.id, score);
  }
  return out;
}
