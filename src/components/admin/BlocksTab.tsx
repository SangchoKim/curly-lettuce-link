"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { newId, socialPlatforms, type Block, type BlockType, type SiteDoc, type SocialPlatform } from "@/lib/schema";
import { SOCIAL_LABELS, SocialIcon } from "@/components/public/SocialIcon";
import { useEditor } from "./Editor";
import { BlockForm } from "./BlockForms";
import { ImagePicker } from "./ImagePicker";
import { Card, Field, Segmented, Switch, TextArea, TextInput, btn } from "../ui";

const TYPE_META: Record<BlockType, { label: string; icon: string }> = {
  link: { label: "링크", icon: "🔗" },
  imageCard: { label: "이미지 카드", icon: "🖼️" },
  header: { label: "헤더", icon: "🔤" },
  divider: { label: "구분선", icon: "➖" },
  youtube: { label: "유튜브", icon: "▶️" },
};

function createBlock(type: BlockType): Block {
  const base = { id: newId(), visible: true };
  switch (type) {
    case "link":
      return { ...base, type, title: "", url: "https://", highlight: false, animation: "none", openInNewTab: false };
    case "imageCard":
      return { ...base, type, imageUrl: "", imageAlt: "", aspect: "16:9", title: "", url: "https://", highlight: false, openInNewTab: false };
    case "header":
      return { ...base, type, text: "", align: "center" };
    case "divider":
      return { ...base, type, style: "line" };
    case "youtube":
      return { ...base, type, videoId: "", format: "video" };
  }
}

function summary(b: Block): string {
  switch (b.type) {
    case "link":
      return b.title || "(제목 없음)";
    case "imageCard":
      return b.title || b.imageAlt || "(이미지 카드)";
    case "header":
      return b.text || "(헤더)";
    case "divider":
      return { line: "선", dots: "점", space: "여백" }[b.style];
    case "youtube":
      return b.title || (b.videoId ? `youtu.be/${b.videoId}` : "(영상 없음)");
  }
}

export function BlocksTab() {
  const { site, update, toast } = useEditor();
  const [openId, setOpenId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function add(type: BlockType) {
    const b = createBlock(type);
    update((s) => ({ ...s, blocks: [b, ...s.blocks] }));
    setOpenId(b.id);
    setMenu(false);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    update((s) => {
      const from = s.blocks.findIndex((b) => b.id === active.id);
      const to = s.blocks.findIndex((b) => b.id === over.id);
      return { ...s, blocks: arrayMove(s.blocks, from, to) };
    });
  }

  function move(id: string, delta: number) {
    update((s) => {
      const i = s.blocks.findIndex((b) => b.id === id);
      const j = i + delta;
      if (j < 0 || j >= s.blocks.length) return s;
      return { ...s, blocks: arrayMove(s.blocks, i, j) };
    });
  }

  function remove(id: string) {
    let snapshot: Block[] = [];
    update((s) => {
      snapshot = s.blocks;
      return { ...s, blocks: s.blocks.filter((b) => b.id !== id) };
    });
    toast("블록을 삭제했어요", { label: "되돌리기", run: () => update((s) => ({ ...s, blocks: snapshot })) });
  }

  function duplicate(id: string) {
    update((s) => {
      const i = s.blocks.findIndex((b) => b.id === id);
      const copy = { ...structuredClone(s.blocks[i]), id: newId() };
      const blocks = [...s.blocks];
      blocks.splice(i + 1, 0, copy);
      return { ...s, blocks };
    });
  }

  return (
    <div className="space-y-4">
      <ProfileCard />

      <div className="relative">
        <button className={`${btn.primary} w-full`} onClick={() => setMenu((v) => !v)} aria-expanded={menu}>
          + 블록 추가
        </button>
        {menu && (
          <div className="absolute inset-x-0 top-12 z-20 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg sm:grid-cols-3">
            {(Object.keys(TYPE_META) as BlockType[]).map((t) => (
              <button key={t} onClick={() => add(t)} className="flex h-12 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-neutral-100">
                <span>{TYPE_META[t].icon}</span>
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {site.blocks.length === 0 && (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          아직 블록이 없어요. 위 버튼으로 첫 링크를 추가해 보세요.
        </p>
      )}

      <DndContext id="blocks-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setOpenId(null)} onDragEnd={onDragEnd}>
        <SortableContext items={site.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {site.blocks.map((b, i) => (
              <BlockRow
                key={b.id}
                block={b}
                index={i}
                open={openId === b.id}
                onToggleOpen={() => setOpenId(openId === b.id ? null : b.id)}
                onMove={(d) => move(b.id, d)}
                onRemove={() => remove(b.id)}
                onDuplicate={() => duplicate(b.id)}
                isLast={i === site.blocks.length - 1}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function BlockRow({
  block,
  index,
  open,
  onToggleOpen,
  onMove,
  onRemove,
  onDuplicate,
  isLast,
}: {
  block: Block;
  index: number;
  open: boolean;
  onToggleOpen: () => void;
  onMove: (d: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  isLast: boolean;
}) {
  const { update, issues, clicks7 } = useEditor();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [more, setMore] = useState(false);
  const hasError = [...issues.keys()].some((k) => k.startsWith(`blocks.${index}.`));
  const clickable = block.type === "link" || block.type === "imageCard";

  function patch(p: Partial<Block>) {
    update((s: SiteDoc) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === block.id ? ({ ...b, ...p } as Block) : b)),
    }));
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-2xl border bg-white ${isDragging ? "z-10 scale-[1.02] shadow-xl" : ""} ${
        hasError ? "border-amber-400" : "border-neutral-200"
      } ${!block.visible ? "opacity-60" : ""}`}
    >
      <div className="flex min-h-14 items-center gap-2 px-2">
        <button
          className="grid h-11 w-8 flex-none cursor-grab touch-none place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 active:cursor-grabbing"
          aria-label="드래그해서 순서 변경"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left" onClick={onToggleOpen} aria-expanded={open}>
          <span className="flex-none">{TYPE_META[block.type].icon}</span>
          <span className="truncate text-sm font-medium">{summary(block)}</span>
          {hasError && <span className="flex-none text-xs text-amber-600">입력 필요</span>}
        </button>
        {clickable && (
          <span className="flex-none text-xs text-neutral-400" title="최근 7일 클릭">
            {clicks7[block.id] ?? 0}회
          </span>
        )}
        {clickable && (
          <button
            className={`grid h-9 w-9 flex-none place-items-center rounded-lg text-lg ${
              (block as { highlight: boolean }).highlight ? "text-amber-500" : "text-neutral-300 hover:text-neutral-500"
            }`}
            onClick={() => patch({ highlight: !(block as { highlight: boolean }).highlight } as Partial<Block>)}
            aria-label="링크 강조"
            aria-pressed={(block as { highlight: boolean }).highlight}
          >
            ★
          </button>
        )}
        <Switch checked={block.visible} onChange={(v) => patch({ visible: v })} label="공개 페이지에 노출" />
        <div className="relative flex-none">
          <button className="grid h-9 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={() => setMore((v) => !v)} aria-label="더보기">
            ⋯
          </button>
          {more && (
            <div className="absolute right-0 top-10 z-20 w-32 rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-lg" onMouseLeave={() => setMore(false)}>
              {index > 0 && (
                <MenuItem onClick={() => { onMove(-1); setMore(false); }}>위로 이동</MenuItem>
              )}
              {!isLast && (
                <MenuItem onClick={() => { onMove(1); setMore(false); }}>아래로 이동</MenuItem>
              )}
              <MenuItem onClick={() => { onDuplicate(); setMore(false); }}>복제</MenuItem>
              <MenuItem danger onClick={() => { onRemove(); setMore(false); }}>삭제</MenuItem>
            </div>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-neutral-100 p-4">
          <BlockForm block={block} index={index} patch={patch} />
        </div>
      )}
    </li>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`block w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-100 ${danger ? "text-red-600" : ""}`}>
      {children}
    </button>
  );
}

function ProfileCard() {
  const { site, update, issues } = useEditor();
  const [open, setOpen] = useState(true);
  const p = site.profile;
  const setProfile = (patch: Partial<SiteDoc["profile"]>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  return (
    <Card
      title="프로필"
      right={
        <button className="text-xs text-neutral-500" onClick={() => setOpen((v) => !v)}>
          {open ? "접기" : "펼치기"}
        </button>
      }
    >
      {open && (
        <>
          <Field label="프로필 사진">
            <ImagePicker value={p.avatarUrl} onChange={(url) => setProfile({ avatarUrl: url })} square={400} previewClass="h-16 w-16 rounded-full" />
          </Field>
          <Field label="이름" error={issues.get("profile.name")} hint={`${p.name.length}/40`}>
            <TextInput value={p.name} maxLength={40} onChange={(e) => setProfile({ name: e.target.value })} invalid={issues.has("profile.name")} />
          </Field>
          <Field label="소개" hint={`${p.bio.length}/200`}>
            <TextArea value={p.bio} maxLength={200} onChange={(e) => setProfile({ bio: e.target.value })} />
          </Field>
          <SocialEditor />
          <Field label="소셜 아이콘 위치">
            <Segmented
              value={p.socialsPosition}
              options={[
                { value: "top", label: "소개 아래" },
                { value: "bottom", label: "페이지 맨 아래" },
              ]}
              onChange={(v) => setProfile({ socialsPosition: v })}
            />
          </Field>
        </>
      )}
    </Card>
  );
}

function SocialEditor() {
  const { site, update, issues } = useEditor();
  const socials = site.profile.socials;
  const set = (next: typeof socials) => update((s) => ({ ...s, profile: { ...s.profile, socials: next } }));

  return (
    <div className="space-y-2">
      <div className="text-[13px] font-medium text-neutral-700">소셜 링크</div>
      {socials.map((s, i) => (
        <div key={s.id} className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-neutral-100 text-neutral-700">
              <SocialIcon platform={s.platform} size={20} />
            </span>
            <select
              value={s.platform}
              onChange={(e) => set(socials.map((x) => (x.id === s.id ? { ...x, platform: e.target.value as SocialPlatform } : x)))}
              className="h-10 w-28 flex-none rounded-xl border border-neutral-300 bg-white px-2 text-sm"
              aria-label="플랫폼"
            >
              {socialPlatforms.map((p) => (
                <option key={p} value={p}>
                  {SOCIAL_LABELS[p]}
                </option>
              ))}
            </select>
            <TextInput
              value={s.url}
              placeholder={s.platform === "email" ? "mailto:me@example.com" : "https://"}
              onChange={(e) => set(socials.map((x) => (x.id === s.id ? { ...x, url: e.target.value } : x)))}
              invalid={issues.has(`profile.socials.${i}.url`)}
            />
            <button className="h-10 w-8 flex-none text-neutral-400 hover:text-neutral-700 disabled:opacity-20" disabled={i === 0} onClick={() => set(arrayMove(socials, i, i - 1))} aria-label="위로">
              ↑
            </button>
            <button className="h-10 w-8 flex-none text-neutral-400 hover:text-red-600" onClick={() => set(socials.filter((x) => x.id !== s.id))} aria-label="삭제">
              ✕
            </button>
          </div>
          {issues.get(`profile.socials.${i}.url`) && <p className="pl-12 text-xs text-red-600">{issues.get(`profile.socials.${i}.url`)}</p>}
        </div>
      ))}
      {socials.length < 10 && (
        <button className={btn.small} onClick={() => set([...socials, { id: newId(), platform: "instagram", url: "https://" }])}>
          + 소셜 링크 추가
        </button>
      )}
    </div>
  );
}
