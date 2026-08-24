"use client";

import { useRef, useState } from "react";
import { uploadReinforcementPhoto } from "@/app/actions";
import { compressImage } from "@/lib/compress-image";
import { Icon } from "@/components/icon";
import { TrackButton } from "@/components/track-button";
import { useDemo } from "@/components/providers";
import {
  BackBar,
  Button,
  Card,
  Eyebrow,
  Footnote,
  PhotoTile,
  Pill,
  PillRow,
  QuoteCard,
  Screen,
  ScreenSub,
  ScreenTitle,
  Tag,
} from "@/components/ui";
import type { SignedPhoto } from "@/lib/photos";

function photoMeta(tag: string) {
  if (tag === "never_again") {
    return { label: "never again", icon: "block", warm: false };
  }
  return { label: "proud of this", icon: "favorite", warm: true };
}

export function HardTruthsView({ photos }: { photos: SignedPhoto[] }) {
  const { showToast } = useDemo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(photos);
  const [tag, setTag] = useState<"proud_of_this" | "never_again" | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.set("file", compressed);
      form.set("caption", caption);
      form.set("tag", tag ?? "");
      form.set("mode", "hard_truths");
      const result = await uploadReinforcementPhoto(form);
      if (result.error || !result.photo) {
        showToast(result.error ?? "Upload failed.");
        return;
      }
      setItems((prev) => [...prev, result.photo]);
      setCaption("");
      showToast("Saved. Your photo, your words.");
    } catch {
      showToast("That photo is too large. Try a smaller one.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Screen>
      <BackBar label="Hard Truths" href="/sos/rails" />
      <Eyebrow>No cheerleading</Eyebrow>
      <ScreenTitle>You said this mattered. So look at it.</ScreenTitle>
      <ScreenSub>
        Your photos. Your words. No system-generated captions — just what you told us was the point.
      </ScreenSub>

      <QuoteCard tag="Coach Marcus — no filter">
        &ldquo;You picked these photos. You wrote those words. Nobody&rsquo;s making you look — you
        already decided this was worth looking at. So look. Then put the fork down and prove
        yourself right.&rdquo;
      </QuoteCard>

      <Card className="bg-ink text-white">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#C7CBCC]">
          Your call, not ours
        </p>
        <p className="text-[13.5px] leading-normal">
          Pick whatever photos actually move you — a moment you&rsquo;re proud of, or one you never
          want to see again. Either works. You choose the photo, you choose the tag, you write the
          caption. We don&rsquo;t generate any of it.
        </p>
      </Card>

      <h2 className="mb-2 text-sm">Your photos, your captions</h2>

      {items.map((photo) => {
        const meta = photoMeta(photo.tag);
        return (
          <Card key={photo.id}>
            <div className="flex gap-3">
              <PhotoTile
                src={photo.url}
                muted={!meta.warm}
                alt={photo.caption}
                className="h-[84px] w-[84px] shrink-0"
              />
              <div className="flex-1">
                <Tag className="mb-1.5">
                  <Icon name={meta.icon} className="text-xs" />
                  You tagged: {meta.label}
                </Tag>
                <p className="mt-1.5 mb-1 text-[11px] font-bold text-ink-70">YOUR CAPTION</p>
                <p className="text-[13.5px] font-bold leading-snug">&ldquo;{photo.caption}&rdquo;</p>
              </div>
            </div>
          </Card>
        );
      })}

      <Card className="border-[1.5px] border-dashed border-ink-30 bg-transparent shadow-none">
        <div className="flex items-start gap-3">
          <PhotoTile add className="h-[84px] w-[84px] shrink-0" />
          <div className="flex-1">
            <p className="mb-2 text-[13px] text-ink-70">
              Add a photo — proud of it, or never want to repeat it, your call. Tag it, then write
              your own caption.
            </p>
            <PillRow>
              <Pill active={tag === "proud_of_this"} onClick={() => setTag("proud_of_this")}>
                Proud of this
              </Pill>
              <Pill active={tag === "never_again"} onClick={() => setTag("never_again")}>
                Never again
              </Pill>
            </PillRow>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write the caption yourself…"
              className="mt-2 min-h-14 w-full resize-none rounded-xl bg-white p-3 text-[13px] text-ink outline-none placeholder:text-ink-70"
            />
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </Button>
          </div>
        </div>
      </Card>

      <Footnote>
        Every photo, every tag, and every caption here is chosen and written by you. Nothing is
        generated for you, and nothing here judges how you look — only what you told us it means to
        you.
      </Footnote>

      <TrackButton
        variant="dark"
        href="/followup"
        path="off_the_rails"
        reinforcement="hard_truths"
        toast="Nice work getting back on track."
        className="mt-3.5"
      >
        Okay. Back on track.
      </TrackButton>
    </Screen>
  );
}
