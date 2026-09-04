import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import {
  validateReinforcementPhoto,
  type HardTruthTag,
  type PhotoMode,
} from "../lib/domain";
import { getSupabase } from "../lib/supabase";
import { logSosEvent, type SosPath } from "./sos";

const PHOTOS_BUCKET = "sos-photos";
const SIGNED_URL_TTL_SECONDS = 3600;
const MAX_IMAGE_WIDTH = 1600;

export type ReinforcementPhoto = {
  id: string;
  user_id: string;
  storage_key: string;
  caption: string | null;
  tag: HardTruthTag | "remember_why";
  mode: PhotoMode;
  created_at: string;
  signed_url: string;
};

type ReinforcementPhotoRow = Omit<ReinforcementPhoto, "signed_url">;

export type SaveReinforcementPhotoInput = {
  caption: string;
  mode: PhotoMode;
  path: SosPath;
  tag?: HardTruthTag;
  uri: string;
  width: number;
};

function photoId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function compressPhoto(uri: string, width: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);

  if (width <= 0 || width > MAX_IMAGE_WIDTH) {
    context.resize({ height: null, width: MAX_IMAGE_WIDTH });
  }

  const rendered = await context.renderAsync();
  const compressed = await rendered.saveAsync({
    compress: 0.7,
    format: SaveFormat.JPEG,
  });

  return compressed.uri;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("You must be signed in to save photos.");
  }

  return data.user.id;
}

export async function saveReinforcementPhoto(
  input: SaveReinforcementPhotoInput,
): Promise<void> {
  const validation = validateReinforcementPhoto({
    caption: input.caption,
    mode: input.mode,
    tag: input.tag,
  });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const compressedUri = await compressPhoto(input.uri, input.width);
  const userId = await requireUserId();
  const response = await fetch(compressedUri);

  if (!response.ok) {
    throw new Error("Couldn't prepare the photo for upload.");
  }

  const blob = await response.blob();
  const storageKey = `${userId}/${photoId()}.jpg`;
  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(storageKey, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const caption = input.caption.trim();
  const { error: insertError } = await supabase
    .from("reinforcement_photos")
    .insert({
      caption: caption || null,
      mode: input.mode,
      storage_key: storageKey,
      tag: input.mode === "remember_why" ? "remember_why" : input.tag,
      user_id: userId,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }

  await logSosEvent(
    input.path,
    input.mode === "remember_why" ? "why" : "hard_truths",
  );
}

export async function fetchPhotos(
  mode: PhotoMode,
): Promise<ReinforcementPhoto[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reinforcement_photos")
    .select("id, user_id, storage_key, caption, tag, mode, created_at")
    .eq("mode", mode)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all(
    ((data ?? []) as ReinforcementPhotoRow[]).map(async (photo) => {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrl(photo.storage_key, SIGNED_URL_TTL_SECONDS);

      if (signedError) {
        throw new Error(signedError.message);
      }

      return {
        ...photo,
        signed_url: signedData.signedUrl,
      };
    }),
  );
}
