export const MIN_WHY_REASONS = 3;
export const MAX_WHY_REASON = 80;
export const MAX_PHOTO_CAPTION = 140;
export const MAX_WHY_PHOTOS = 20;

export type WhyScreenMode = "needs_reasons" | "ready";

export type WhyReason = {
  id: string;
  label: string;
  sort_order: number;
};

export const WHY_REASON_SUGGESTIONS = [
  "My kids",
  "My health",
  "The person I want to be",
  "A promise I made",
  "How I want to feel",
  "Someone I love",
] as const;

export const WHY_COPY = {
  title: "You know what it takes",
  subtitle:
    "You've done hard things before. Here's what you're working toward, and why.",
  topReasonLabel: "Your top reason",
  reasonsTitle: "Write your top 3 reasons",
  reasonsBody: "The first one is the reason we'll put in front of you.",
  reasonsProgress: (remaining: number) =>
    remaining === 1 ? "1 more to go" : `${remaining} more to go`,
  addReason: "Add a reason",
  photosTitle: "Photos that motivate you",
  photosBody:
    "Upload photos that remind you of your why, the goal weight you hit before, a hard thing you finished, a major accomplishment, someone you admire. These photos rotate so it never feels stale.",
  choosePhoto: "Choose photo",
  takePhoto: "Take photo",
  captionLabel: "Caption",
  savePhoto: "Save photo",
  savingPhoto: "Saving…",
  rotate: "Show another photo",
  settingsLabel: "Manage photos and captions",
  settingsTitle: "Your photos",
  emptyPhotos: "Add a photo when you are ready.",
} as const;

export const WHY_ERRORS = {
  load: "We couldn’t load Remember Your Why. Try again.",
  reason: "We couldn’t save that reason. Try again.",
  photo: "We couldn’t save that photo. Try again.",
  caption: "We couldn’t update that caption. Try again.",
  remove: "We couldn’t remove that photo. Try again.",
} as const;

export function getWhyScreenMode(reasonCount: number): WhyScreenMode {
  return reasonCount < MIN_WHY_REASONS ? "needs_reasons" : "ready";
}

export function getTopWhyReason(
  reasons: readonly { label: string; sort_order: number }[],
): string | null {
  const top = [...reasons].sort((left, right) => left.sort_order - right.sort_order)[0];
  const label = top?.label.trim();
  return label ? label : null;
}

export function quoteWhyReason(label: string): string {
  return `"${label.trim()}"`;
}

export function getUnusedWhyReasonSuggestions(
  existingLabels: readonly string[],
): string[] {
  const have = new Set(
    existingLabels.map((label) => label.trim().toLowerCase()).filter(Boolean),
  );
  return WHY_REASON_SUGGESTIONS.filter((label) => !have.has(label.toLowerCase()));
}

export function getWhyReasonValidationError(
  raw: string,
  existingLower: string[],
): string | null {
  const value = raw.trim();
  if (value.length === 0) return "Write a reason first.";
  if (value.length > MAX_WHY_REASON) {
    return "Keep reasons under 80 characters.";
  }
  if (existingLower.includes(value.toLowerCase())) {
    return "That reason is already listed.";
  }
  return null;
}

export function getPhotoCaptionValidationError(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return "Write a caption for this photo.";
  if (value.length > MAX_PHOTO_CAPTION) {
    return "Keep captions under 140 characters.";
  }
  return null;
}

export function pickNextWhyPhoto<T extends { id: string }>(
  photos: readonly T[],
  currentId: string | null,
): T | null {
  if (photos.length === 0) return null;
  const others = photos.filter((photo) => photo.id !== currentId);
  if (others.length === 0) return photos[0];
  return others[0];
}

export function pickRandomWhyPhoto<T extends { id: string }>(
  photos: readonly T[],
  random: () => number = Math.random,
): T | null {
  if (photos.length === 0) return null;
  return photos[Math.floor(random() * photos.length)] ?? photos[0];
}
