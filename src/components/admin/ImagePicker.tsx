"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./upload";
import { btn } from "../ui";

export function ImagePicker({
  value,
  onChange,
  square,
  label = "이미지 올리기",
  allowRemove = true,
  previewClass = "h-16 w-16 rounded-xl",
  uploadOpts,
  onBusyChange,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  square?: number;
  label?: string;
  allowRemove?: boolean;
  previewClass?: string;
  uploadOpts?: { maxSide?: number; quality?: number };
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    try {
      onChange(await uploadImage(f, { square, ...uploadOpts }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={`${previewClass} flex-none border border-neutral-200 object-cover`} />
        ) : (
          <div className={`${previewClass} grid flex-none place-items-center border border-dashed border-neutral-300 text-xs text-neutral-400`}>
            없음
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.small} onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "올리는 중…" : value ? "바꾸기" : label}
          </button>
          {value && allowRemove && (
            <button type="button" className={btn.small} onClick={() => onChange(null)}>
              삭제
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
