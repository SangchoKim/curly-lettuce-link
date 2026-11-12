// node --test --experimental-strip-types src/lib/search.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, choseong, looseIncludes, searchScores } from "./search.ts";

const index = buildIndex([
  { id: "a", no: 27, title: "초음파 가습기 대용량", keywords: ["humidifier"], categoryName: "가전" },
  { id: "b", no: 3, title: "27인치 모니터", keywords: [], categoryName: "가전" },
  { id: "c", no: 5, title: "무선 청소기 V8", keywords: ["다이슨"], categoryName: "생활" },
  { id: "d", no: 6, title: "무선 마우스", keywords: [], categoryName: "디지털" },
  { id: "e", no: 7, title: "가스레인지 커버", keywords: [], categoryName: "주방" },
]);

/** 점수 순 id 목록 */
function ids(q: string): string[] | null {
  const r = searchScores(index, q);
  return r ? [...r.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id) : null;
}

test("빈 검색어는 null", () => {
  assert.equal(ids(""), null);
  assert.equal(ids("   "), null);
});

test("영상 번호 일치가 제목 포함보다 먼저", () => {
  assert.deepEqual(ids("27"), ["a", "b"]);
  assert.equal(searchScores(index, "27")!.get("a"), 1);
});

test("초성 검색", () => {
  assert.deepEqual(ids("ㄱㅅㄱ"), ["a"]);
  assert.equal(choseong("가습기"), "ㄱㅅㄱ");
});

test("한글 조합 중에도 결과 유지", () => {
  // 가습기를 치는 중: 가 → 갓 → 가스 → 가습
  for (const partial of ["가", "갓", "가스", "가습", "가ㅅ"]) {
    assert.ok(ids(partial)!.includes("a"), `'${partial}'에서 가습기가 사라짐`);
  }
  assert.ok(looseIncludes("가습기", "갓"));
  assert.ok(!looseIncludes("가방", "갓"));
});

test("여러 단어는 모두 포함(AND)", () => {
  assert.deepEqual(ids("무선 청소"), ["c"]);
  assert.deepEqual(ids("무선 없는말"), []);
});

test("키워드·카테고리·대소문자·공백 무시", () => {
  assert.deepEqual(ids("HUMIDIFIER"), ["a"]);
  assert.deepEqual(ids("다이슨"), ["c"]);
  assert.deepEqual(ids("생활"), ["c"]);
  assert.deepEqual(ids("청소 기"), ["c"]);
});
