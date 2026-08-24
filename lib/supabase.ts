import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PHOTOS_BUCKET = "sos-photos";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function requireEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`${names.join(" or ")} is not set. Add your Supabase keys to .env.`);
}

export function createSupabaseAdmin(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function isPlaceholderKey(storageKey: string) {
  return !storageKey.includes("/") || storageKey.startsWith("placeholder");
}

export function assertImageFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use a JPG, PNG, or WebP photo.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photos need to be under 15MB.");
  }
}

export async function ensurePhotoBucket(supabase: SupabaseClient) {
  const { data } = await supabase.storage.getBucket(PHOTOS_BUCKET);
  if (data) return;

  const { error } = await supabase.storage.createBucket(PHOTOS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(error.message);
  }
}

export async function uploadUserPhoto(userId: string, file: File) {
  const supabase = createSupabaseAdmin();
  await ensurePhotoBucket(supabase);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const storageKey = `${userId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(storageKey, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return storageKey;
}

export async function signedPhotoUrl(storageKey: string) {
  if (isPlaceholderKey(storageKey)) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(storageKey, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
