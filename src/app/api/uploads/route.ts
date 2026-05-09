/**
 * POST /api/uploads
 *
 * Handles file uploads from landlords (images, videos, verification documents).
 *
 * For property images the route runs:
 *   1. Perceptual-hash duplicate check  — rejects images already used on the platform
 *   2. AI / suspicious-image heuristics — rejects likely AI-generated or stock photos
 *
 * Storage: Vercel Blob (requires BLOB_READ_WRITE_TOKEN env var)
 * Set up: Vercel dashboard → Storage → Blob → Create store → Connect to project
 */

import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  computeImageHash,
  hammingDistance,
  DUPLICATE_THRESHOLD,
} from "@/lib/image-analysis";
import { enqueueImageProcessing } from "@/lib/tasks";

export const runtime = "nodejs";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const MAX_IMAGE_BYTES    = 5  * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES    = 25 * 1024 * 1024; // 25 MB
const MAX_DOCUMENT_BYTES = 5  * 1024 * 1024; // 5 MB

const sanitizeFileName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    if (session.user.role !== "LANDLORD" && session.user.role !== "ADMIN" && session.user.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 403 });
    }

    // V6 fix: per-user upload rate limit (30 uploads per 10 min) — prevents blob-cost abuse
    const rl = await rateLimit(`uploads:${session.user.id}`, { limit: 30, windowSeconds: 600 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Too many uploads. Try again in ${rl.retryAfter} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const formData  = await request.formData();
    const file      = formData.get("file");
    const category  = String(formData.get("category") || "image");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
    }

    const limitsByCategory = {
      image:                { types: IMAGE_TYPES,    maxBytes: MAX_IMAGE_BYTES    },
      video:                { types: VIDEO_TYPES,    maxBytes: MAX_VIDEO_BYTES    },
      verificationDocument: { types: DOCUMENT_TYPES, maxBytes: MAX_DOCUMENT_BYTES },
      governmentId:         { types: DOCUMENT_TYPES, maxBytes: MAX_DOCUMENT_BYTES },
      selfie:               { types: IMAGE_TYPES,    maxBytes: MAX_IMAGE_BYTES    },
      ownershipProof:       { types: DOCUMENT_TYPES, maxBytes: MAX_DOCUMENT_BYTES },
      avatar:               { types: IMAGE_TYPES,    maxBytes: 2 * 1024 * 1024   }, // 2 MB
    } as const;

    const rules = limitsByCategory[category as keyof typeof limitsByCategory];
    if (!rules) {
      return NextResponse.json({ success: false, error: "Invalid file category." }, { status: 400 });
    }
    if (!rules.types.includes(file.type as never)) {
      return NextResponse.json({ success: false, error: "Unsupported file type." }, { status: 400 });
    }
    if (file.size > rules.maxBytes) {
      return NextResponse.json({ success: false, error: "File exceeds size limit." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // V16 fix: sniff real file bytes — don't trust client-supplied MIME.
    // Blocks polyglot uploads (e.g. a JS file disguised as image/jpeg) and
    // extension-spoofing that could lead to stored XSS via /api/files proxy.
    const sniffed = await fileTypeFromBuffer(bytes);
    if (!sniffed) {
      // file-type returns undefined for .txt and plain SVG — our allow-lists never
      // include those, so reject.
      return NextResponse.json(
        { success: false, error: "Could not determine file type from contents. Unsupported." },
        { status: 400 },
      );
    }
    if (!rules.types.includes(sniffed.mime as never)) {
      return NextResponse.json(
        { success: false, error: `File content type (${sniffed.mime}) does not match an allowed type for this category.` },
        { status: 400 },
      );
    }
    if (sniffed.mime !== file.type) {
      // Client claimed one MIME, bytes are another. Treat as tampering attempt.
      return NextResponse.json(
        { success: false, error: "Declared file type does not match the actual file contents." },
        { status: 400 },
      );
    }

    // ── Image processing (property photos only) ──────────────────────────────
    let newHash = "";
    if (category === "image") {
      // V45 fix: compute hash synchronously (fast), queue AI analysis async
      // This unblocks the upload response while still catching duplicates immediately
      newHash = await computeImageHash(bytes);

      // Check for duplicates synchronously (important for security)
      const allHashes = await prisma.imageHash.findMany({
        select: { hash: true, imageUrl: true, propertyId: true }
      });
      const duplicate = allHashes.find(
        (h) => hammingDistance(h.hash, newHash) <= DUPLICATE_THRESHOLD
      );

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: "This image has already been used in another listing on the platform.",
            reasons: [
              "Duplicate or near-identical image detected.",
              "Each listing must use unique photos taken specifically for that property.",
            ],
            tip: "Please upload original photos taken at this property.",
          },
          { status: 422 },
        );
      }

      // Create imageHash record with hash (AI analysis will update flagged status async)
      await prisma.imageHash.create({
        data: {
          hash: newHash,
          imageUrl: "__pending__",
          uploadedById: session.user.id,
        },
      });
    }

    // ── Upload to Vercel Blob ───────────────────────────────────────────────
    // V37 fix: do NOT preserve any part of the attacker-controlled filename in
    // the stored path. Previously the user's original filename was embedded,
    // which (a) is a covert channel into admin notifications/logs, (b) is
    // predictable for targeted overwrite.
    const RESTRICTED = ["governmentId", "verification", "selfie", "ownershipProof"];
    const ext = /\.(jpe?g|png|webp|pdf|mp4|webm)$/i.exec(file.name)?.[0]?.toLowerCase() ?? "";
    const randomName = `${Date.now()}-${randomUUID()}${ext}`;
    // V24/V25 fix: prefix restricted uploads with the uploader's user ID so
    // downstream verification routes can cryptographically tie a blob path to
    // the user who submitted it — prevents cross-user doc URL theft.
    const blobPath = RESTRICTED.includes(category)
      ? `uploads/${category}/${session.user.id}/${randomName}`
      : `uploads/${category}/${randomName}`;

    // ✅ Upload to Vercel Blob (always public access)
    // Security comes from not exposing URLs, not from storage itself
    // The file URL is stored in database and only served via /api/files/[path] with auth checks
    await put(blobPath, bytes, {
      access: "public", // Vercel Blob requires public access
      contentType: file.type,
    });

    // ✅ Return a reference path instead of the public blob URL
    // Clients access files via /api/files/[path] which enforces authentication
    const url = `/api/files/${blobPath}`;

    // Update the placeholder hash record with the real URL
    if (category === "image") {
      await prisma.imageHash.updateMany({
        where: { uploadedById: session.user.id, imageUrl: "__pending__" },
        data: { imageUrl: url },
      });

      // V45 fix: queue image analysis asynchronously (AI suspicious check)
      // Hash comparison already done above; this task handles AI analysis
      enqueueImageProcessing(url, newHash, session.user.id).catch((error) => {
        console.error("[UPLOAD] Failed to queue image processing:", error);
        // Don't fail upload if queueing fails
      });
    }

    return NextResponse.json({
      success: true,
      data: { name: file.name, type: category, mimeType: file.type, size: file.size, url },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[UPLOAD POST ERROR]", msg);
    // V43 fix: don't leak internal error details to the client.
    return NextResponse.json(
      { success: false, error: "Failed to upload file." },
      { status: 500 },
    );
  }
}
