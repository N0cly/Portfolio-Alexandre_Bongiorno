"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createLink,
  updateLink,
  deleteLink,
  reorderLinks,
} from "@/app/admin/settings/links-actions";

export type AdminLink = {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  visible: boolean;
};

export function LinksManager({ initial }: { initial: AdminLink[] }) {
  const router = useRouter();
  const [items, setItems] = useState<AdminLink[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function flashStatus(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  async function handleCreate(data: { label: string; url: string }) {
    startTransition(async () => {
      const result = await createLink({ ...data, visible: true });
      if (result.ok) {
        setShowAdd(false);
        router.refresh();
        flashStatus("Lien ajouté ✓");
      } else {
        flashStatus(`Erreur : ${result.error}`);
      }
    });
  }

  async function handleUpdate(id: string, patch: Partial<AdminLink>) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
    startTransition(async () => {
      const result = await updateLink({ id, ...patch });
      if (result.ok) {
        router.refresh();
      } else {
        flashStatus(`Erreur : ${result.error}`);
        setItems(initial);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce lien ?")) return;
    const prev = items;
    setItems(items.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await deleteLink(id);
      if (result.ok) {
        router.refresh();
        flashStatus("Lien supprimé");
      } else {
        flashStatus(`Erreur : ${result.error}`);
        setItems(prev);
      }
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(items, oldIndex, newIndex);
    setItems(newOrder);
    startTransition(async () => {
      const result = await reorderLinks(newOrder.map((i) => i.id));
      if (result.ok) {
        router.refresh();
      } else {
        flashStatus(`Erreur : ${result.error}`);
        setItems(initial);
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Liens externes
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Visibles dans le header et sur la page contact (Instagram, mail,
            Behance, etc.)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-full border border-neutral-900 px-4 py-1.5 text-xs uppercase tracking-[0.2em] hover:bg-neutral-900 hover:text-white transition"
        >
          {showAdd ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {status && <p className="text-xs text-neutral-700">{status}</p>}

      {showAdd && (
        <AddLinkForm onSubmit={handleCreate} isPending={isPending} />
      )}

      {items.length === 0 ? (
        <p className="py-4 text-sm text-neutral-500">
          Aucun lien pour l'instant.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {items.map((link) => (
                <SortableLinkRow
                  key={link.id}
                  link={link}
                  onUpdate={(patch) => handleUpdate(link.id, patch)}
                  onDelete={() => handleDelete(link.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function AddLinkForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { label: string; url: string }) => void;
  isPending: boolean;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    onSubmit({ label: label.trim(), url: url.trim() });
    setLabel("");
    setUrl("");
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 md:grid-cols-[1fr_2fr_auto]"
    >
      <input
        type="text"
        placeholder="Label (ex: Instagram)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 outline-none"
      />
      <input
        type="url"
        placeholder="https://instagram.com/votre-compte"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-neutral-900 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {isPending ? "..." : "Ajouter"}
      </button>
    </form>
  );
}

function SortableLinkRow({
  link,
  onUpdate,
  onDelete,
}: {
  link: AdminLink;
  onUpdate: (patch: Partial<AdminLink>) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);

  function saveEdit() {
    if (label.trim() && url.trim() && (label !== link.label || url !== link.url)) {
      onUpdate({ label: label.trim(), url: url.trim() });
    }
    setEditing(false);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 ${
        isDragging ? "ring-2 ring-neutral-900 shadow-lg" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-neutral-400 hover:text-neutral-700 active:cursor-grabbing"
        aria-label="Réordonner"
      >
        ⋮⋮
      </button>

      {editing ? (
        <div className="flex flex-1 flex-col gap-2 md:flex-row">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-900"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-[2] rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-900"
          />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900">{link.label}</p>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs text-neutral-500 hover:text-neutral-900"
          >
            {link.url}
          </a>
        </div>
      )}

      <button
        onClick={() => onUpdate({ visible: !link.visible })}
        className={`flex h-5 w-9 items-center rounded-full transition ${
          link.visible
            ? "bg-green-600 justify-end"
            : "bg-neutral-300 justify-start"
        }`}
        title={link.visible ? "Visible — cliquer pour masquer" : "Masqué"}
      >
        <span className="mx-0.5 h-4 w-4 rounded-full bg-white" />
      </button>

      <div className="flex gap-1">
        {editing ? (
          <>
            <button
              onClick={saveEdit}
              className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white hover:bg-neutral-700"
            >
              OK
            </button>
            <button
              onClick={() => {
                setLabel(link.label);
                setUrl(link.url);
                setEditing(false);
              }}
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100"
              title="Éditer"
            >
              ✎
            </button>
            <button
              onClick={onDelete}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              title="Supprimer"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </li>
  );
}
