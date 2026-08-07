/**
 * Browser-side half of the signed-upload flow. Never touches
 * CLOUDINARY_API_SECRET — it only holds the signature our server already
 * computed, and uploads the file directly to Cloudinary (CDC §5.4's "upload
 * direct"), never routing the binary through our own server.
 */

export type UploadKind = "trip-photo" | "agency-document";

export interface UploadResult {
  secureUrl: string;
  publicId: string;
}

export class UploadError extends Error {}

/**
 * Uploads one file and returns its Cloudinary URL. Every param sent in the
 * FormData must be exactly what the server signed — Cloudinary recomputes
 * the same hash and rejects the request if anything differs (see the
 * signing comment in src/lib/cloudinary.ts).
 */
export async function uploadFile(file: File, kind: UploadKind): Promise<UploadResult> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });

  if (!signRes.ok) {
    const data = await signRes.json().catch(() => ({}));
    throw new UploadError(data.error ?? "Impossible de préparer l'envoi du fichier.");
  }

  const { cloudName, apiKey, timestamp, signature, folder } = (await signRes.json()) as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
  };

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);

  // "auto" lets Cloudinary classify the asset itself — images and PDFs both
  // upload through the same endpoint, so this one client doesn't need to
  // know the difference between the two callers.
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: form,
  });

  if (!uploadRes.ok) {
    const data = await uploadRes.json().catch(() => ({}));
    throw new UploadError(data?.error?.message ?? "L'envoi du fichier a échoué.");
  }

  const data = (await uploadRes.json()) as { secure_url: string; public_id: string };
  return { secureUrl: data.secure_url, publicId: data.public_id };
}
