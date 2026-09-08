import type { HardTruthTag } from "../lib/domain";

export const HARD_TRUTHS_COPY = {
  title: "You said this mattered. So look at it.",
  subtitle:
    "Your photos. Your words. No system-generated captions, just what you told us was the point.",
  yourCallEyebrow: "Your call, not ours",
  yourCallBody:
    "Pick whatever photos actually move you, a moment you're proud of, or one you never want to see again. Either works. You choose the photo, you choose the tag, you write the caption. We don't generate any of it.",
  photosTitle: "Your photos, your captions",
  youTagged: "You tagged:",
  yourCaption: "YOUR CAPTION",
  addBody:
    "Add a photo: proud of it, or never want to repeat it, your call. Tag it, then write your own caption.",
  proud: "Proud of this",
  never: "Never again",
  upload: "Upload photo",
  captionLabel: "Caption",
  save: "Save photo",
  saving: "Saving…",
  footnote:
    "Every photo, every tag, and every caption here is chosen and written by you. Nothing is generated for you, and nothing here judges how you look, only what you told us it means to you.",
  backOnTrack: "Okay. Back on track",
  coachDefault:
    "You picked these photos. You wrote those words. Nobody's making you look, you already decided this was worth looking at. So look. Then put the fork down and prove yourself right.",
} as const;

export function getCoachNoFilterLabel(name: string): string {
  return `Coach ${name}, no filter`;
}

export function getHardTruthTagPhrase(tag: HardTruthTag): string {
  return tag === "proud_of_this" ? "proud of this" : "never again";
}

export function getHardTruthTaggedLabel(tag: HardTruthTag): string {
  return `${HARD_TRUTHS_COPY.youTagged} ${getHardTruthTagPhrase(tag)}`;
}

export function quoteHardTruthCaption(caption: string): string {
  return `"${caption.trim()}"`;
}

export function getFavoritePhotoLabel(
  caption: string,
  favorited: boolean,
): string {
  const name = caption.trim() || "this photo";
  return favorited ? `Unfavorite ${name}` : `Favorite ${name}`;
}
