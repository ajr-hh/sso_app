import { signedPhotoUrl } from "@/lib/supabase";

export type PhotoRecord = {
  id: string;
  storageKey: string;
  caption: string;
  tag: string;
  mode: string;
};

export type SignedPhoto = PhotoRecord & { url: string | null };

export async function withSignedUrls(photos: PhotoRecord[]): Promise<SignedPhoto[]> {
  return Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      url: await signedPhotoUrl(photo.storageKey),
    })),
  );
}
