"use client";

import { useEffect, useRef, useState } from "react";
import {
  CATEGORY_META,
  CATEGORY_RATINGS,
  GEM_CATEGORIES,
  RATING_LABELS,
  type Gem,
  type GemCategory,
} from "@/lib/gems";

type FormState = {
  name: string;
  category: GemCategory;
  neighborhood: string;
  address: string;
  description: string;
  photoUrl: string;
  huntWeek: string;
  price: string;
  ratings: Record<string, string>;
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "cafe",
  neighborhood: "",
  address: "",
  description: "",
  photoUrl: "",
  huntWeek: "",
  price: "",
  ratings: {},
};

const MAX_EDGE = 1200;

function formFromGem(gem: Gem): FormState {
  return {
    name: gem.name,
    category: gem.category,
    neighborhood: gem.neighborhood ?? "",
    address: gem.address ?? "",
    description: gem.description ?? "",
    photoUrl: gem.photo_url ?? "",
    huntWeek: gem.hunt_week ?? "",
    price: gem.price ? String(gem.price) : "",
    ratings: Object.fromEntries(Object.entries(gem.ratings ?? {}).map(([k, v]) => [k, String(v)])),
  };
}

// Phone photos are often 5-10 MB. Shrink to ~1200px JPEG in the browser so
// uploads are fast, stay under Vercel's request limit, and cards load quickly.
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // applies EXIF rotation
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", 0.85)
  );
}

const inputClass = "mt-1 w-full rounded-md border border-[#2A2A2A] bg-black/40 px-3 py-2 text-sm";
const selectClass = `${inputClass} text-[#F0EDE8]`;

export function GemManager() {
  const [gems, setGems] = useState<Gem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const formTop = useRef<HTMLFormElement>(null);

  async function reload() {
    try {
      const res = await fetch("/api/admin/gems");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load gems");
      setGems(data.gems);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load gems");
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/admin/gems");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load gems");
        setGems(data.gems);
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load gems");
      }
    }
    init();
  }, []);

  function reset() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function startEdit(gem: Gem) {
    setForm(formFromGem(gem));
    setEditingId(gem.id);
    setMessage(null);
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const blob = await shrinkImage(file);
      const body = new FormData();
      body.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/admin/gems/photo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setForm((f) => ({ ...f, photoUrl: data.url }));
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : "photo upload failed"}`);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(editingId ? `/api/admin/gems/${editingId}` : "/api/admin/gems", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.price ? Number(form.price) : null,
          // Only send the rating fields shown for this category.
          ratings: Object.fromEntries(
            CATEGORY_RATINGS[form.category].filter((k) => form.ratings[k]).map((k) => [k, Number(form.ratings[k])])
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save gem");
      setMessage(`${editingId ? "Saved" : "Added"} "${data.gem.name}" — live at /gems`);
      reset();
      await reload();
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-10">
      <h2 className="font-display mb-4 text-2xl">HIDDEN GEMS</h2>

      <form
        ref={formTop}
        onSubmit={handleSubmit}
        className="mb-8 max-w-md scroll-mt-6 rounded-xl border border-[#2A2A2A] bg-[#141414] p-5"
      >
        <h3 className="mb-4 text-sm font-semibold tracking-wide text-[#F5C518]">
          {editingId ? `Editing: ${form.name || "gem"}` : "Add hidden gem"}
        </h3>

        <label className="mb-3 block text-sm">
          Name
          <input
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className="mb-3 block text-sm">
          Category
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as GemCategory })}
            className={selectClass}
          >
            {GEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="mb-3 grid grid-cols-2 gap-3 text-sm">
          <legend className="mb-1">Ratings (stars out of 5, optional)</legend>
          {CATEGORY_RATINGS[form.category].map((key) => (
            <label key={key} className="block text-xs text-[#F0EDE8]/60">
              {RATING_LABELS[key]}
              <select
                value={form.ratings[key] ?? ""}
                onChange={(e) => setForm({ ...form, ratings: { ...form.ratings, [key]: e.target.value } })}
                className={selectClass}
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="block text-xs text-[#F0EDE8]/60">
            Price
            <select
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={selectClass}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {"$".repeat(n)} ({n} / 5)
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <label className="mb-3 block text-sm">
          Neighborhood
          <input
            maxLength={120}
            value={form.neighborhood}
            onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
            placeholder="West Village"
            className={inputClass}
          />
        </label>

        <label className="mb-3 block text-sm">
          Address
          <input
            maxLength={240}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className="mb-3 block text-sm">
          Why it&apos;s a hidden gem
          <textarea
            rows={4}
            maxLength={1000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </label>

        <div className="mb-3 text-sm">
          Photo
          {form.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.photoUrl}
              alt="Gem preview"
              className="mt-2 aspect-[4/3] w-full rounded-md border border-[#2A2A2A] object-cover"
            />
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label
              className={`cursor-pointer rounded-md border border-[#F5C518]/40 px-3 py-1.5 text-xs font-semibold text-[#F5C518] hover:bg-[#F5C518]/10 ${
                uploading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {uploading ? "Uploading..." : form.photoUrl ? "Replace photo" : "Choose photo"}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {form.photoUrl && (
              <button
                type="button"
                onClick={() => setForm({ ...form, photoUrl: "" })}
                className="rounded-md border border-red-400/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10"
              >
                Remove photo
              </button>
            )}
          </div>
          <input
            type="url"
            value={form.photoUrl}
            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            placeholder="...or paste an image URL"
            className={`${inputClass} text-xs`}
          />
        </div>

        <label className="mb-4 block text-sm">
          Spotlight (optional)
          <input
            maxLength={60}
            value={form.huntWeek}
            onChange={(e) => setForm({ ...form, huntWeek: e.target.value })}
            placeholder="Chelsea"
            className={inputClass}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-md bg-[#F5C518] px-4 py-2 text-sm font-semibold text-[#0A0A0A] disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Add gem"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-[#2A2A2A] px-4 py-2 text-sm text-[#F0EDE8]/70 hover:bg-white/5"
            >
              Cancel
            </button>
          )}
        </div>
        {message && <p className="mt-3 break-all text-xs text-[#F0EDE8]/70">{message}</p>}
      </form>

      <h3 className="mb-3 text-sm font-semibold tracking-wide text-[#F5C518]">All gems</h3>
      {loadError && <p className="text-sm text-red-400">{loadError}</p>}
      {!gems && !loadError && <p className="text-sm text-[#F0EDE8]/50">Loading...</p>}
      {gems && gems.length === 0 && <p className="text-sm text-[#F0EDE8]/50">No gems yet.</p>}
      {gems && gems.length > 0 && (
        <ul className="max-w-2xl divide-y divide-[#2A2A2A] rounded-xl border border-[#2A2A2A]">
          {gems.map((g) => (
            <li key={g.id} className={`flex items-center gap-3 p-3 ${editingId === g.id ? "bg-[#F5C518]/5" : ""}`}>
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-black/40">
                {g.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.photo_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.name}</p>
                <p className="truncate text-xs text-[#F0EDE8]/50">
                  {CATEGORY_META[g.category].label}
                  {g.neighborhood ? ` · ${g.neighborhood}` : ""}
                  {g.photo_url ? "" : " · no photo"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => startEdit(g)}
                className="rounded border border-[#F5C518]/40 px-2.5 py-1 text-xs text-[#F5C518] hover:bg-[#F5C518]/10"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
