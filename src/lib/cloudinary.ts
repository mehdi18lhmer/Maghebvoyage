import "server-only";

import crypto from "node:crypto";

/**
 * Cloudinary signed-upload signing (CDC §5.4 — "Cloudinary : upload direct,
 * CDN intégré").
 *
 * "Upload direct" means the browser uploads straight to Cloudinary — the
 * file never passes through our server. What our server does instead is
 * *sign* the upload: CLOUDINARY_API_SECRET computes a one-time signature over
 * the exact params the client is about to send, and the secret itself never
 * leaves this file. A stolen signature is useless a few minutes later or for
 * any param set other than the one it was computed for — a stolen secret
 * would let someone upload as us indefinitely.
 */

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  /** Echoed back so the client sends exactly the params that were signed — see below. */
  params: Record<string, string>;
}

/**
 * Signs a set of upload params for direct-to-Cloudinary upload.
 *
 * Cloudinary's rule: the signature is a SHA-1 of every param that will be
 * sent (except `file`, `api_key`, `resource_type` and `signature` itself),
 * sorted alphabetically as `key=value` pairs joined with `&`, with the API
 * secret appended raw (not as a param) before hashing. Any mismatch between
 * what was signed and what the client actually sends — even the params being
 * in a different case, or one extra param added client-side — makes
 * Cloudinary reject the upload. That's deliberate: it stops a compromised
 * client from uploading to a different folder than the one authorised here.
 */
export function signUpload(params: Record<string, string | number>): UploadSignature {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");

  const timestamp = Math.floor(Date.now() / 1000);
  const allParams: Record<string, string> = {
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    timestamp: String(timestamp),
  };

  const stringToSign =
    Object.keys(allParams)
      .sort()
      .map((key) => `${key}=${allParams[key]}`)
      .join("&") + apiSecret;

  const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: String(params.folder ?? ""),
    params: allParams,
  };
}
