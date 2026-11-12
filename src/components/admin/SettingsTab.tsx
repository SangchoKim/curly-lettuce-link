"use client";

import type { SiteDoc } from "@/lib/schema";
import { useEditor } from "./Editor";
import { ImagePicker } from "./ImagePicker";
import { Card, Field, Segmented, TextArea, TextInput, ToggleRow, btn } from "../ui";

export function SettingsTab() {
  const { site, update, siteUrl } = useEditor();
  const seo = site.seo;
  const setSeo = (p: Partial<SiteDoc["seo"]>) => update((s) => ({ ...s, seo: { ...s.seo, ...p } }));
  const setSettings = (p: Partial<SiteDoc["settings"]>) => update((s) => ({ ...s, settings: { ...s.settings, ...p } }));

  return (
    <div className="space-y-4">
      <Card title="검색·공유 미리보기 (SEO)">
        <Field label="제목" hint="비우면 이름 사용">
          <TextInput value={seo.title} maxLength={70} placeholder={site.profile.name} onChange={(e) => setSeo({ title: e.target.value })} />
        </Field>
        <Field label="설명" hint="비우면 소개 첫 줄 사용">
          <TextArea value={seo.description} maxLength={200} placeholder={site.profile.bio.split("\n")[0]} onChange={(e) => setSeo({ description: e.target.value })} />
        </Field>
        <Field label="공유 이미지 (OG)" hint="1200×630 권장, 없으면 프로필 사진">
          <ImagePicker value={seo.ogImageUrl} previewClass="h-16 w-28 rounded-xl" onChange={(url) => setSeo({ ogImageUrl: url })} />
        </Field>
        <Field label="파비콘">
          <Segmented
            value={seo.favicon.kind}
            options={[
              { value: "emoji", label: "이모지" },
              { value: "avatar", label: "프로필 사진" },
            ]}
            onChange={(v) => setSeo({ favicon: v === "emoji" ? { kind: "emoji", value: "🔗" } : { kind: "avatar" } })}
          />
        </Field>
        {seo.favicon.kind === "emoji" && (
          <TextInput
            value={seo.favicon.value}
            maxLength={8}
            className="w-24 text-center text-lg"
            onChange={(e) => setSeo({ favicon: { kind: "emoji", value: e.target.value || "🔗" } })}
            aria-label="파비콘 이모지"
          />
        )}
        <ToggleRow label="검색엔진 노출 허용" desc="끄면 noindex로 표시해요" checked={seo.allowIndexing} onChange={(v) => setSeo({ allowIndexing: v })} />
      </Card>

      <Card title="공유">
        <ToggleRow label="공유 버튼 표시" checked={site.settings.showShareButton} onChange={(v) => setSettings({ showShareButton: v })} />
        <ToggleRow label="데스크톱에서 QR 표시" checked={site.settings.showDesktopQr} onChange={(v) => setSettings({ showDesktopQr: v })} />
        <Field label="사이트 주소" hint="NEXT_PUBLIC_SITE_URL">
          <TextInput value={siteUrl} readOnly className="bg-neutral-50 text-neutral-500" />
        </Field>
        <p className="text-xs text-neutral-500">QR 코드와 공유 미리보기에 이 주소를 써요. 배포 후 환경변수로 실제 도메인을 넣어 주세요.</p>
      </Card>

      <Card title="백업">
        <a href="/api/export" className={`${btn.ghost} inline-flex items-center`}>
          JSON 내보내기
        </a>
      </Card>
    </div>
  );
}
