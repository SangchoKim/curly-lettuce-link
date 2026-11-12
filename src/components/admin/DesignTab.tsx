"use client";

import { fontKeys, type Theme } from "@/lib/schema";
import { PRESETS, applyPreset } from "@/lib/presets";
import { ALL_GOOGLE_FONT_KEYS, FONT_LABELS, FONT_VARS, backgroundCss, googleFontHref, buttonContrast, themeToCssVars } from "@/lib/theme";
import { useEditor } from "./Editor";
import { ImagePicker } from "./ImagePicker";
import { Card, ColorField, Field, Segmented } from "../ui";

export function DesignTab() {
  const { site, update } = useEditor();
  const t = site.theme;
  const set = (patch: Partial<Theme>) => update((s) => ({ ...s, theme: { ...s.theme, ...patch, presetId: null } }));
  const setBtn = (patch: Partial<Theme["button"]>) => set({ button: { ...t.button, ...patch } });
  const contrast = buttonContrast(t);
  const bg = t.background;

  return (
    <div className="space-y-4">
      <Card title="프리셋">
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => {
            const theme = applyPreset(t, p);
            return (
              <button
                key={p.id}
                onClick={() => update((s) => ({ ...s, theme: applyPreset(s.theme, p) }))}
                className={`overflow-hidden rounded-xl border-2 text-left transition ${t.presetId === p.id ? "border-neutral-900" : "border-transparent hover:border-neutral-300"}`}
                aria-pressed={t.presetId === p.id}
              >
                <div className="flex h-20 flex-col justify-center gap-1.5 px-2.5" style={{ ...backgroundCss(theme), ...themeToCssVars(theme) }}>
                  <span className="h-4 rounded-[var(--ml-btn-radius)] border-[length:var(--ml-btn-border-w)] border-[var(--ml-btn-border)] bg-[var(--ml-btn-bg)] shadow-[var(--ml-btn-shadow)]" />
                  <span className="h-4 rounded-[var(--ml-btn-radius)] bg-[var(--ml-accent)]" />
                </div>
                <div className="bg-white px-2 py-1.5 text-xs font-medium">{p.name}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="배경">
        <Segmented
          value={bg.type}
          options={[
            { value: "solid", label: "단색" },
            { value: "gradient", label: "그라데이션" },
            { value: "image", label: "이미지" },
          ]}
          onChange={(v) => {
            const base = bg.type === "solid" ? bg.color : bg.type === "gradient" ? bg.from : "#FFFFFF";
            if (v === "solid") set({ background: { type: "solid", color: base } });
            if (v === "gradient") set({ background: { type: "gradient", from: base, to: "#7C5CFF", angle: 160 } });
            if (v === "image") set({ background: { type: "image", url: "", dim: 0.3 } });
          }}
        />
        {bg.type === "solid" && <ColorField label="배경색" value={bg.color} onChange={(c) => set({ background: { ...bg, color: c } })} />}
        {bg.type === "gradient" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="시작 색" value={bg.from} onChange={(c) => set({ background: { ...bg, from: c } })} />
              <ColorField label="끝 색" value={bg.to} onChange={(c) => set({ background: { ...bg, to: c } })} />
            </div>
            <Field label="각도" hint={`${bg.angle}°`}>
              <input type="range" min={0} max={360} value={bg.angle} onChange={(e) => set({ background: { ...bg, angle: Number(e.target.value) } })} className="w-full accent-neutral-900" />
            </Field>
          </>
        )}
        {bg.type === "image" && (
          <>
            <Field label="배경 이미지">
              <ImagePicker value={bg.url || null} allowRemove={false} previewClass="h-20 w-14 rounded-xl" onChange={(url) => set({ background: { ...bg, url: url ?? "" } })} />
            </Field>
            <Field label="어둡게" hint={`${Math.round(bg.dim * 100)}%`}>
              <input type="range" min={0} max={0.8} step={0.05} value={bg.dim} onChange={(e) => set({ background: { ...bg, dim: Number(e.target.value) } })} className="w-full accent-neutral-900" />
            </Field>
          </>
        )}
      </Card>

      <Card title="버튼">
        <Field label="모양">
          <Segmented
            value={t.button.shape}
            options={[
              { value: "square", label: "각짐" },
              { value: "rounded", label: "둥근" },
              { value: "pill", label: "알약" },
            ]}
            onChange={(v) => setBtn({ shape: v })}
          />
        </Field>
        <Field label="스타일">
          <div className="grid grid-cols-4 gap-2">
            {(["fill", "outline", "soft", "hardShadow"] as const).map((style) => {
              const preview = { ...t, button: { ...t.button, style } };
              return (
                <button
                  key={style}
                  onClick={() => setBtn({ style })}
                  className={`rounded-xl border-2 p-2 ${t.button.style === style ? "border-neutral-900" : "border-neutral-200"}`}
                  style={backgroundCss(t)}
                  aria-pressed={t.button.style === style}
                >
                  <span
                    style={themeToCssVars(preview)}
                    className="block h-7 rounded-[var(--ml-btn-radius)] border-[length:var(--ml-btn-border-w)] border-[var(--ml-btn-border)] bg-[var(--ml-btn-bg)] text-[10px] leading-6 font-semibold text-[var(--ml-btn-text)] shadow-[var(--ml-btn-shadow)]"
                  >
                    {{ fill: "채움", outline: "외곽선", soft: "소프트", hardShadow: "섀도" }[style]}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="버튼 색" value={t.button.color} onChange={(c) => setBtn({ color: c })} />
          <ColorField label="버튼 글자색" value={t.button.textColor} onChange={(c) => setBtn({ textColor: c })} />
        </div>
        {contrast < 3 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            버튼 글자가 배경과 잘 구분되지 않아요 (대비 {contrast.toFixed(1)}:1). 3:1 이상을 권장해요.
          </p>
        )}
      </Card>

      <Card title="색">
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="글자색" value={t.textColor} onChange={(c) => set({ textColor: c })} />
          <ColorField label="강조색" value={t.accentColor} onChange={(c) => set({ accentColor: c })} />
        </div>
      </Card>

      <Card title="폰트">
        <link rel="stylesheet" href={googleFontHref(ALL_GOOGLE_FONT_KEYS)!} precedence="default" />
        <div className="grid gap-2">
          {fontKeys.map((f) => (
            <button
              key={f}
              onClick={() => update((s) => ({ ...s, theme: { ...s.theme, font: f } }))}
              className={`flex items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left ${t.font === f ? "border-neutral-900" : "border-neutral-200"}`}
              style={{ fontFamily: FONT_VARS[f] }}
              aria-pressed={t.font === f}
            >
              <span className="text-[15px]">안녕하세요, 내 링크예요</span>
              <span className="text-xs text-neutral-500">{FONT_LABELS[f]}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
