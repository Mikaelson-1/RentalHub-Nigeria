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
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  computeImageHash,
  hammingDistance,
  DUPLICATE_THRESHOLD,
  analyzeImage,
} from "@/lib/image-analysis";

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
    if (session.user.role !== "LANDLORD" && session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Only landlords can upload files." }, { status: 403 });
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

    // ── Image analysis (property photos only) ──────────────────────────────
    if (category === "image") {
      // 1. Suspicious / AI-generated check
      const analysis = await analyzeImage(bytes, file.name);
      if (analysis.suspicious) {
        return NextResponse.json(
          {
            success: false,
            error: "This image was automatically rejected.",
            reasons: analysis.reasons,
            tip: "Please upload a real photo taken at the property with your phone or camera.",
          },
          { status: 422 },
        );
      }

      // 2. Duplicate detection — compare against all stored hashes
      const newHash    = await computeImageHash(bytes);
      const allHashes  = await prisma.imageHash.findMany({ select: { hash: true, imageUrl: true, propertyId: true } });
      const duplicate  = allHashes.find(
        (h) => hammingDistance(h.hash, newHash) <= DUPLICATE_THRESHOLD,
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

      // Store the hash (imageUrl filled in after write below — we'll update if needed)
      // We store it now with a placeholder and update after write
      await prisma.imageHash.create({
        data: {
          hash:         newHash,
          imageUrl:     "__pending__",
          uploadedById: session.user.id,
        },
      });
    }

    // ── Upload to Vercel Blob ───────────────────────────────────────────────
    const ext        = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const finalName  = `${Date.now()}-${randomUUID()}-${sanitizeFileName(file.name.replace(/\.[^.]+$/, ""))}${ext}`;
    const blobPath   = `uploads/${category}/${finalName}`;

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
        data:  { imageUrl: url },
      });
    }

    return NextResponse.json({
      success: true,
      data: { name: file.name, type: category, mimeType: file.type, size: file.size, url },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[UPLOAD POST ERROR]", msg);
    return NextResponse.json(
      { success: false, error: "Failed to upload file.", detail: msg },
      { status: 500 },
    );
  }
}
