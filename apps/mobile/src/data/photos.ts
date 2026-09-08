import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import {
  validateReinforcementPhoto,
  type HardTruthTag,
  type PhotoMode,
} from "../lib/domain";
import { newId } from "../lib/ids";
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
  favorited: boolean;
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

  // RN file:// fetches often report the blob as text/plain. Storage rejects
  // that mime even when contentType is set, so upload the raw JPEG bytes.
  const bytes = await response.arrayBuffer();
  const storageKey = `${userId}/${newId()}.jpg`;
  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(storageKey, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    if (/mime type/i.test(uploadError.message)) {
      throw new Error("We couldn’t save that photo. Try another image.");
    }
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

export async function setPhotoFavorited(
  id: string,
  favorited: boolean,
): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("reinforcement_photos")
    .update({ favorited })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Photo was not found or is no longer active.");
  }
}

export async function updateReinforcementPhotoCaption(
  id: string,
  caption: string,
): Promise<void> {
  const trimmed = caption.trim();
  if (trimmed.length === 0) {
    throw new Error("Write a caption for this photo.");
  }
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("reinforcement_photos")
    .update({ caption: trimmed })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Photo was not found or is no longer active.");
  }
}

export async function removeReinforcementPhoto(id: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("reinforcement_photos")
    .update({ deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Photo was not found or is no longer active.");
  }
}

export async function fetchPhotos(
  mode: PhotoMode,
): Promise<ReinforcementPhoto[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reinforcement_photos")
    .select("id, user_id, storage_key, caption, tag, mode, favorited, created_at")
    .eq("mode", mode)
    .eq("deleted", false)
    .order("favorited", { ascending: false })
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
