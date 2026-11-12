"use client";

import { useState } from "react";
import { MAX_CATEGORIES, newId, type Product } from "@/lib/schema";
import { sameNoCount } from "@/lib/shop";
import { useEditor } from "./Editor";
import { ImagePicker } from "./ImagePicker";
import { uploadImage } from "./upload";
import { Field, TextInput } from "../ui";

export const PRODUCT_UPLOAD = { maxSide: 600, quality: 0.8 };

export type ProductDraft = Omit<Product, "id" | "createdAt" | "visible" | "pinned"> & Partial<Pick<Product, "id" | "createdAt" | "visible" | "pinned">>;

/**
 * 상품 입력 필드 묶음 (빠른 등록과 목록 편집 공용).
 * 폼 안 아무 입력에서나 Ctrl/⌘+V로 이미지를 붙여넣을 수 있다.
 */
export function ProductFields({
  value,
  onChange,
  errors,
  onBusyChange,
  urlInputRef,
  selfId,
}: {
  value: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
  errors: Record<string, string | undefined>;
  onBusyChange: (busy: boolean) => void;
  urlInputRef?: React.Ref<HTMLInputElement>;
  selfId?: string;
}) {
  const { site, update } = useEditor();
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const dupNo = sameNoCount(site.shop.products, value.no, selfId);

  async function onPaste(e: React.ClipboardEvent) {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    setPasteError(null);
    setPasting(true);
    onBusyChange(true);
    try {
      onChange({ imageUrl: await uploadImage(file, PRODUCT_UPLOAD) });
    } catch (err) {
      setPasteError((err as Error).message);
    } finally {
      setPasting(false);
      onBusyChange(false);
    }
  }

  function createCategory() {
    if (site.shop.categories.length >= MAX_CATEGORIES) {
      window.alert(`카테고리는 최대 ${MAX_CATEGORIES}개까지 만들 수 있어요`);
      return;
    }
    const name = window.prompt("새 카테고리 이름 (12자 이내)")?.trim().slice(0, 12);
    if (!name) return;
    const existing = site.shop.categories.find((c) => c.name === name);
    if (existing) {
      onChange({ categoryId: existing.id });
      return;
    }
    const id = newId();
    update((s) => ({ ...s, shop: { ...s.shop, categories: [...s.shop.categories, { id, name }] } }));
    onChange({ categoryId: id });
  }

  return (
    <div className="space-y-3" onPaste={onPaste}>
      <Field label="제휴 링크 URL" error={errors.url}>
        <TextInput
          ref={urlInputRef}
          value={value.url}
          type="url"
          inputMode="url"
          placeholder="https://link.coupang.com/..."
          onChange={(e) => onChange({ url: e.target.value.trim() })}
          invalid={!!errors.url}
        />
      </Field>
      <Field label="상품명" error={errors.title} hint={`${value.title.length}/60`}>
        <TextInput value={value.title} maxLength={60} onChange={(e) => onChange({ title: e.target.value })} invalid={!!errors.title} />
      </Field>
      <Field label="이미지" hint="파일 선택 · 이미지 URL · Ctrl/⌘+V 붙여넣기" error={errors.imageUrl ?? pasteError ?? undefined}>
        <div className="space-y-2">
          <ImagePicker
            value={value.imageUrl}
            onChange={(url) => onChange({ imageUrl: url })}
            uploadOpts={PRODUCT_UPLOAD}
            onBusyChange={onBusyChange}
            label={pasting ? "붙여넣는 중…" : "이미지 올리기"}
          />
          <TextInput
            value={value.imageUrl && !value.imageUrl.startsWith("/media/") ? value.imageUrl : ""}
            placeholder="또는 이미지 주소 https://..."
            onChange={(e) => onChange({ imageUrl: e.target.value.trim() || null })}
          />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="카테고리">
          <select
            value={value.categoryId ?? ""}
            onChange={(e) => {
              if (e.target.value === "__new") createCategory();
              else onChange({ categoryId: e.target.value || null });
            }}
            className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="">미분류</option>
            {site.shop.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.name}
              </option>
            ))}
            <option value="__new">+ 새 카테고리</option>
          </select>
        </Field>
        <Field label="영상 번호" error={errors.no} hint={dupNo ? `같은 번호 ${dupNo}개` : undefined}>
          <TextInput
            value={value.no ?? ""}
            inputMode="numeric"
            placeholder="없음"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 5);
              onChange({ no: v ? Number(v) : null });
            }}
          />
        </Field>
        <Field label="가격 (선택)" hint="예: 12,900원">
          <TextInput value={value.priceText ?? ""} maxLength={16} onChange={(e) => onChange({ priceText: e.target.value || undefined })} />
        </Field>
        <Field label="배지 (선택)" hint="예: 30%↓">
          <TextInput value={value.badge ?? ""} maxLength={8} onChange={(e) => onChange({ badge: e.target.value || undefined })} />
        </Field>
      </div>
      <Field label="검색 키워드 (쉼표로 구분, 화면엔 안 보여요)">
        <KeywordsInput value={value.keywords} onChange={(keywords) => onChange({ keywords })} />
      </Field>
    </div>
  );
}

function KeywordsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [raw, setRaw] = useState(value.join(", "));
  const [synced, setSynced] = useState(value);
  // 바깥에서 값이 초기화되면(빠른 등록 후) 입력칸도 비움
  if (value !== synced && value.join(",") !== raw.split(",").map((s) => s.trim()).filter(Boolean).join(",")) {
    setSynced(value);
    setRaw(value.join(", "));
  }
  return (
    <TextInput
      value={raw}
      placeholder="가습기, humidifier, 원룸"
      onChange={(e) => {
        setRaw(e.target.value);
        const list = e.target.value
          .split(",")
          .map((s) => s.trim().slice(0, 20))
          .filter(Boolean)
          .slice(0, 10);
        setSynced(list);
        onChange(list);
      }}
    />
  );
}
