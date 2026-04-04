/**
 * Image Analysis Utilities
 *
 * Provides:
 *  1. Perceptual hashing (aHash) — detect duplicate / recycled images across listings
 *  2. Suspicious-image heuristics — flag likely AI-generated or stock photos
 *
 * Uses the `sharp` library which is already installed.
 */

import sharp from "sharp";

// ── Perceptual Hash (average hash / aHash) ───────────────────────────────────
// Resize image to 8×8 grayscale, compare each pixel to the average brightness.
// Two images with hamming distance ≤ 8 are considered duplicates.

export async function computeImageHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const avg = data.reduce((sum: number, v: number) => sum + v, 0) / data.length;
  return Array.from(data)
    .map((v: number) => (v >= avg ? "1" : "0"))
    .join("");
}

export function hammingDistance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

/** ≤ 8 bits different = near-duplicate */
export const DUPLICATE_THRESHOLD = 8;

// ── Suspicious / AI-generated image detection ────────────────────────────────

export interface AnalysisResult {
  suspicious: boolean;
  reasons: string[];
}

/** AI image generators almost always produce perfect-square power-of-two sizes */
const AI_DIMENSIONS = new Set([256, 512, 768, 1024, 1280, 1536, 2048]);

/** Filename prefixes / patterns common in AI tools */
const AI_FILENAME_PATTERNS = [
  /^image[-_]\d+\.png$/i,
  /^generated[-_]/i,
  /^dalle[-_]/i,
  /^midjourney[-_]/i,
  /^stablediffusion/i,
  /^ai[-_]image/i,
  /^img[-_]\d{4,}\.png$/i, // e.g. img_0042.png — common bulk export
  /^photo[-_]\d+\.jpg$/i,
  /^flux[-_]/i,
  /^firefly[-_]/i,
];

export async function analyzeImage(
  buffer: Buffer,
  filename: string,
): Promise<AnalysisResult> {
  const reasons: string[] = [];

  try {
    const meta = await sharp(buffer).metadata();

    // ① Missing EXIF — real smartphone / camera photos always contain EXIF
    if (!meta.exif) {
      reasons.push(
        "No camera metadata (EXIF) found. Genuine property photos taken with a phone or camera always contain this.",
      );
    }

    // ② Perfect square AI dimensions
    if (
      meta.width &&
      meta.height &&
      AI_DIMENSIONS.has(meta.width) &&
      AI_DIMENSIONS.has(meta.height) &&
      meta.width === meta.height
    ) {
      reasons.push(
        `Image is a perfect ${meta.width}×${meta.height} square — a dimension common in AI image generators.`,
      );
    }

    // ③ Unrealistically high resolution with no EXIF (stock photo pattern)
    if (!meta.exif && meta.width && meta.height) {
      const megapixels = (meta.width * meta.height) / 1_000_000;
      if (megapixels > 20) {
        reasons.push(
          `Unusually high resolution (${meta.width}×${meta.height}, ~${megapixels.toFixed(0)} MP) with no camera metadata — consistent with a stock or AI-generated image.`,
        );
      }
    }

    // ④ Filename matches AI tool patterns
    const base = filename.split("/").pop() ?? filename;
    if (AI_FILENAME_PATTERNS.some((p) => p.test(base))) {
      reasons.push(
        `Filename "${base}" matches naming patterns used by AI image generation tools.`,
      );
    }

    // ⑤ PNG with no EXIF and perfect-power-of-2 width (very common with diffusion models)
    if (
      meta.format === "png" &&
      !meta.exif &&
      meta.width &&
      (meta.width & (meta.width - 1)) === 0 // is power of 2
    ) {
      reasons.push(
        `PNG format with no camera metadata and a power-of-2 width (${meta.width}px) — consistent with AI-generated output.`,
      );
    }
  } catch {
    // If sharp can't read the image it's likely corrupted
    reasons.push("Image file could not be fully parsed — it may be corrupted or manipulated.");
  }

  // Require 2+ signals before flagging to minimise false positives
  return { suspicious: reasons.length >= 2, reasons };
}
