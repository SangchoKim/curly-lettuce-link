"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MAX_CATEGORIES, newId, type Category, type SiteDoc } from "@/lib/schema";
import { useEditor } from "./Editor";
import { Modal, TextInput, btn } from "../ui";

export function CategoryManager() {
  const { site, update, toast, issues } = useEditor();
  const cats = site.shop.categories;
  const [deleting, setDeleting] = useState<Category | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const counts = new Map<string, number>();
  for (const p of site.shop.products) if (p.categoryId) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);

  const setCats = (fn: (c: Category[]) => Category[]) => update((s) => ({ ...s, shop: { ...s.shop, categories: fn(s.shop.categories) } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setCats((c) => arrayMove(c, c.findIndex((x) => x.id === active.id), c.findIndex((x) => x.id === over.id)));
  }

  function remove(cat: Category, moveTo: string | null) {
    let snapshot: SiteDoc["shop"] | null = null;
    update((s) => {
      snapshot = s.shop;
      return {
        ...s,
        shop: {
          ...s.shop,
          categories: s.shop.categories.filter((c) => c.id !== cat.id),
          products: s.shop.products.map((p) => (p.categoryId === cat.id ? { ...p, categoryId: moveTo } : p)),
        },
      };
    });
    setDeleting(null);
    toast(`'${cat.name}' 카테고리를 삭제했어요`, {
      label: "되돌리기",
      run: () => snapshot && update((s) => ({ ...s, shop: snapshot! })),
    });
  }

  return (
    <div className="space-y-2">
      <DndContext id="categories-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={cats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {cats.map((c, i) => (
              <CategoryRow
                key={c.id}
                cat={c}
                count={counts.get(c.id) ?? 0}
                error={issues.get(`shop.categories.${i}.name`)}
                onChange={(patch) => setCats((list) => list.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))}
                onDelete={() => ((counts.get(c.id) ?? 0) === 0 ? remove(c, null) : setDeleting(c))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {cats.length === 0 && <p className="text-sm text-neutral-500">카테고리가 없어요. 공개 페이지에 칩이 표시되지 않아요.</p>}
      {cats.length < MAX_CATEGORIES && (
        <button className={btn.small} onClick={() => setCats((c) => [...c, { id: newId(), name: `카테고리${c.length + 1}` }])}>
          + 카테고리 추가
        </button>
      )}
      <DeleteModal cat={deleting} count={deleting ? counts.get(deleting.id) ?? 0 : 0} others={cats.filter((c) => c.id !== deleting?.id)} onClose={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}

function CategoryRow({
  cat,
  count,
  error,
  onChange,
  onDelete,
}: {
  cat: Category;
  count: number;
  error?: string;
  onChange: (p: Partial<Category>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-xl border bg-white ${isDragging ? "z-10 shadow-lg" : ""} ${error ? "border-amber-400" : "border-neutral-200"}`}>
      <div className="flex items-center gap-2 p-1.5">
        <button className="grid h-10 w-7 flex-none cursor-grab touch-none place-items-center text-neutral-400" aria-label="드래그해서 순서 변경" {...attributes} {...listeners}>
          ⠿
        </button>
        <TextInput value={cat.emoji ?? ""} maxLength={4} placeholder="😀" className="w-14 flex-none text-center" aria-label="이모지" onChange={(e) => onChange({ emoji: e.target.value || undefined })} />
        <TextInput value={cat.name} maxLength={12} aria-label="카테고리 이름" invalid={!!error} onChange={(e) => onChange({ name: e.target.value })} />
        <span className="w-12 flex-none text-right text-xs text-neutral-400">{count}개</span>
        <button className="h-10 w-8 flex-none text-neutral-400 hover:text-red-600" onClick={onDelete} aria-label="카테고리 삭제">
          ✕
        </button>
      </div>
      {error && <p className="px-3 pb-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}

function DeleteModal({
  cat,
  count,
  others,
  onClose,
  onConfirm,
}: {
  cat: Category | null;
  count: number;
  others: Category[];
  onClose: () => void;
  onConfirm: (cat: Category, moveTo: string | null) => void;
}) {
  const [moveTo, setMoveTo] = useState<string>("");
  return (
    <Modal open={!!cat} onClose={onClose} title={`'${cat?.name}' 삭제`}>
      <div className="space-y-4 text-sm">
        <p>이 카테고리에 상품 {count}개가 있어요. 상품은 지우지 않고 아래로 옮겨요.</p>
        <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-2">
          <option value="">미분류로 두기</option>
          {others.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji ? `${c.emoji} ` : ""}
              {c.name}(으)로 옮기기
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button className={btn.ghost} onClick={onClose}>
            취소
          </button>
          <button className={`${btn.primary} bg-red-600`} onClick={() => cat && onConfirm(cat, moveTo || null)}>
            삭제
          </button>
        </div>
      </div>
    </Modal>
  );
}
