# mylink

인스타·틱톡 프로필용 개인 멀티링크 페이지. 기획: `../plan/multilink-plan.md`

1. `cp .env.example .env.local` 후 `ADMIN_PASSWORD`, `SESSION_SECRET` 입력 (Node 20+)
2. `npm install && npm run dev`
3. 공개 페이지 http://localhost:3000 · 편집 http://localhost:3000/admin
4. 저장소는 `STORAGE_DRIVER`로 선택
   - `supabase` (기본): Supabase 프로젝트 `mylink` — 테이블 `mylink_site`, `mylink_daily_stats`, 버킷 `mylink-media`. `SUPABASE_URL`, `SUPABASE_SECRET_KEY` 필요
   - `file`: 로컬 `data/` JSON (오프라인 개발용)
5. Vercel 배포 시 위 환경변수를 Vercel 프로젝트에 그대로 넣으면 돼요
6. 상품(쇼핑 쇼츠용): 편집 화면 `상품` 탭에서 등록 — 기획: `../plan/search-category-plan.md`
   - 공개 페이지에서 상품명·영상 번호(No.)·초성 검색, 카테고리 칩, 최신/인기 정렬. `/?q=27`, `/?c=<카테고리ID>` 딥링크
   - DB 변경 SQL은 `supabase/migrations/`에 있어요
