"use client";

import { useRef, useState } from "react";
import { uploadReinforcementPhoto } from "@/app/actions";
import { compressImage } from "@/lib/compress-image";
import { useDemo } from "@/components/providers";
import { Footnote, PhotoTile } from "@/components/ui";
import type { SignedPhoto } from "@/lib/photos";

export function WhyPhotos({ photos }: { photos: SignedPhoto[] }) {
  const { showToast } = useDemo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(photos);
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file || uploading) return;
    if (items.length >= 20) {
      showToast("That's the 20-photo cap.");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.set("file", compressed);
      form.set("mode", "remember_why");
      form.set("caption", "Remember this.");
      form.set("tag", "remember_why");
      const result = await uploadReinforcementPhoto(form);
      if (result.error || !result.photo) {
        showToast(result.error ?? "Upload failed.");
        return;
      }
      setItems((prev) => [...prev, result.photo]);
      showToast("Photo saved.");
    } catch {
      showToast("That photo is too large. Try a smaller one.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {items.map((photo) => (
          <PhotoTile key={photo.id} src={photo.url} alt={photo.caption} />
        ))}
        {items.length < 20 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="block w-full"
            aria-label="Upload a photo"
          >
            <PhotoTile add />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <Footnote>
        {uploading
          ? "Uploading…"
          : "Upload up to 20 photos — the goal weight you hit before, a hard thing you finished, someone you admire. They rotate so it never feels stale."}
      </Footnote>
    </>
  );
}
