"use client";

import { useState } from "react";
import type { Block, ImageCardBlock, LinkBlock, YoutubeBlock } from "@/lib/schema";
import { parseYoutube } from "@/lib/youtube";
import { useEditor } from "./Editor";
import { ImagePicker } from "./ImagePicker";
import { Field, Segmented, TextInput, ToggleRow } from "../ui";

type Patch = (p: Partial<Block>) => void;

export function BlockForm({ block, index, patch }: { block: Block; index: number; patch: Patch }) {
  const { issues } = useEditor();
  const err = (field: string) => issues.get(`blocks.${index}.${field}`);

  switch (block.type) {
    case "link":
      return <LinkForm block={block} patch={patch} err={err} />;
    case "imageCard":
      return <ImageCardForm block={block} patch={patch} err={err} />;
    case "header":
      return (
        <div className="space-y-4">
          <Field label="텍스트" error={err("text")} hint={`${block.text.length}/60`}>
            <TextInput autoFocus value={block.text} maxLength={60} onChange={(e) => patch({ text: e.target.value })} invalid={!!err("text")} />
          </Field>
          <Field label="정렬">
            <Segmented
              value={block.align}
              options={[
                { value: "left", label: "왼쪽" },
                { value: "center", label: "가운데" },
              ]}
              onChange={(v) => patch({ align: v })}
            />
          </Field>
        </div>
      );
    case "divider":
      return (
        <Field label="스타일">
          <Segmented
            value={block.style}
            options={[
              { value: "line", label: "선" },
              { value: "dots", label: "점" },
              { value: "space", label: "여백" },
            ]}
            onChange={(v) => patch({ style: v })}
          />
        </Field>
      );
    case "youtube":
      return <YoutubeForm block={block} patch={patch} err={err} />;
  }
}

function LinkForm({ block, patch, err }: { block: LinkBlock; patch: Patch; err: (f: string) => string | undefined }) {
  const [mode, setMode] = useState<"none" | "emoji" | "image">(block.thumbnail?.kind ?? "none");
  const chips = block.chips ?? [];
  const thumbUrl = block.thumbnail?.kind === "image" ? block.thumbnail.url : null;
  return (
    <div className="space-y-4">
      <Field label="제목" error={err("title")} hint={`${block.title.length}/60`}>
        <TextInput autoFocus value={block.title} maxLength={60} onChange={(e) => patch({ title: e.target.value })} invalid={!!err("title")} />
      </Field>
      <Field label="URL" error={err("url")}>
        <TextInput value={block.url} type="url" inputMode="url" onChange={(e) => patch({ url: e.target.value.trim() })} invalid={!!err("url")} />
      </Field>
      <Field label="설명 (선택)" hint={`${block.description?.length ?? 0}/80`}>
        <TextInput value={block.description ?? ""} maxLength={80} onChange={(e) => patch({ description: e.target.value || undefined })} />
      </Field>
      <Field label="썸네일">
        <Segmented
          value={mode}
          options={[
            { value: "none", label: "없음" },
            { value: "emoji", label: "이모지" },
            { value: "image", label: "이미지" },
          ]}
          onChange={(v) => {
            setMode(v);
            if (v === "none") patch({ thumbnail: undefined } as Partial<LinkBlock>);
            if (v === "emoji") patch({ thumbnail: { kind: "emoji", value: "✨" } } as Partial<LinkBlock>);
            if (v === "image" && !thumbUrl) patch({ thumbnail: undefined } as Partial<LinkBlock>);
          }}
        />
      </Field>
      {mode === "emoji" && block.thumbnail?.kind === "emoji" && (
        <Field label="이모지">
          <TextInput
            value={block.thumbnail.value}
            maxLength={8}
            className="w-24 text-center text-lg"
            onChange={(e) => patch({ thumbnail: { kind: "emoji", value: e.target.value || "✨" } } as Partial<LinkBlock>)}
          />
        </Field>
      )}
      {mode === "image" && (
        <Field label="썸네일 이미지">
          <ImagePicker
            value={thumbUrl}
            square={200}
            onChange={(url) => patch({ thumbnail: url ? { kind: "image", url } : undefined } as Partial<LinkBlock>)}
          />
        </Field>
      )}
      <Field label="태그 칩 (최대 2개, 쉼표로 구분)">
        <ChipsInput value={chips} onChange={(list) => patch({ chips: list.length ? list : undefined } as Partial<LinkBlock>)} />
      </Field>
      <ToggleRow label="링크 강조" desc="강조색으로 눈에 띄게 보여줘요" checked={block.highlight} onChange={(v) => patch({ highlight: v } as Partial<LinkBlock>)} />
      {block.highlight && (
        <Field label="강조 애니메이션">
          <Segmented
            value={block.animation}
            options={[
              { value: "none", label: "없음" },
              { value: "wiggle", label: "흔들림" },
              { value: "pulse", label: "물결" },
            ]}
            onChange={(v) => patch({ animation: v } as Partial<LinkBlock>)}
          />
        </Field>
      )}
      <ToggleRow label="새 탭에서 열기" desc="인앱 브라우저에서는 꺼 두는 게 안전해요" checked={block.openInNewTab} onChange={(v) => patch({ openInNewTab: v } as Partial<LinkBlock>)} />
    </div>
  );
}

/** 쉼표 입력 중에도 글자가 사라지지 않도록 원문은 로컬로 유지 */
function ChipsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [raw, setRaw] = useState(value.join(", "));
  return (
    <TextInput
      value={raw}
      placeholder="NEW, 할인"
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(
          e.target.value
            .split(",")
            .map((c) => c.trim().slice(0, 12))
            .filter(Boolean)
            .slice(0, 2),
        );
      }}
    />
  );
}

function ImageCardForm({ block, patch, err }: { block: ImageCardBlock; patch: Patch; err: (f: string) => string | undefined }) {
  return (
    <div className="space-y-4">
      <Field label="이미지" error={err("imageUrl") ? "이미지를 올려 주세요" : undefined}>
        <ImagePicker value={block.imageUrl || null} allowRemove={false} previewClass="h-20 w-32 rounded-xl" onChange={(url) => patch({ imageUrl: url ?? "" } as Partial<ImageCardBlock>)} />
      </Field>
      <Field label="대체 텍스트" hint="이미지를 설명하는 짧은 문장">
        <TextInput value={block.imageAlt} maxLength={120} onChange={(e) => patch({ imageAlt: e.target.value } as Partial<ImageCardBlock>)} />
      </Field>
      <Field label="비율">
        <Segmented
          value={block.aspect}
          options={[
            { value: "16:9", label: "16:9" },
            { value: "1:1", label: "1:1" },
            { value: "4:5", label: "4:5" },
          ]}
          onChange={(v) => patch({ aspect: v } as Partial<ImageCardBlock>)}
        />
      </Field>
      <Field label="제목 (선택)" hint={`${block.title.length}/60`}>
        <TextInput value={block.title} maxLength={60} onChange={(e) => patch({ title: e.target.value } as Partial<ImageCardBlock>)} />
      </Field>
      <Field label="설명 (선택)">
        <TextInput value={block.description ?? ""} maxLength={120} onChange={(e) => patch({ description: e.target.value || undefined } as Partial<ImageCardBlock>)} />
      </Field>
      <Field label="URL" error={err("url")}>
        <TextInput value={block.url} type="url" inputMode="url" onChange={(e) => patch({ url: e.target.value.trim() } as Partial<ImageCardBlock>)} invalid={!!err("url")} />
      </Field>
      <ToggleRow label="강조" checked={block.highlight} onChange={(v) => patch({ highlight: v } as Partial<ImageCardBlock>)} />
      <ToggleRow label="새 탭에서 열기" checked={block.openInNewTab} onChange={(v) => patch({ openInNewTab: v } as Partial<ImageCardBlock>)} />
    </div>
  );
}

function YoutubeForm({ block, patch, err }: { block: YoutubeBlock; patch: Patch; err: (f: string) => string | undefined }) {
  const [raw, setRaw] = useState(block.videoId ? (block.format === "shorts" ? `https://youtube.com/shorts/${block.videoId}` : `https://youtu.be/${block.videoId}`) : "");
  const [bad, setBad] = useState(false);
  return (
    <div className="space-y-4">
      <Field label="유튜브 주소" error={bad ? "유튜브 주소를 인식하지 못했어요" : err("videoId")}>
        <TextInput
          autoFocus
          value={raw}
          placeholder="https://youtu.be/... 또는 /shorts/..."
          invalid={bad || !!err("videoId")}
          onChange={(e) => {
            setRaw(e.target.value);
            const p = parseYoutube(e.target.value);
            setBad(!p && e.target.value.trim().length > 0);
            if (p) patch({ videoId: p.videoId, format: p.format } as Partial<YoutubeBlock>);
          }}
        />
      </Field>
      <Field label="형식">
        <Segmented
          value={block.format}
          options={[
            { value: "video", label: "일반 (16:9)" },
            { value: "shorts", label: "쇼츠 (9:16)" },
          ]}
          onChange={(v) => patch({ format: v } as Partial<YoutubeBlock>)}
        />
      </Field>
      <Field label="캡션 (선택)">
        <TextInput value={block.title ?? ""} maxLength={60} onChange={(e) => patch({ title: e.target.value || undefined } as Partial<YoutubeBlock>)} />
      </Field>
    </div>
  );
}
