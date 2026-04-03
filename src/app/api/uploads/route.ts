/**
 * POST /api/uploads
 *
 * Handles file uploads from landlords (images, videos, verification documents).
 *
 * ⚠️  STORAGE WARNING — READ BEFORE DEPLOYING TO PRODUCTION
 * ──────────────────────────────────────────────────────────
 * Files are currently written to `public/uploads/` on the local filesystem.
 * This works fine for local development, but will NOT persist on Railway
 * or any container-based host that resets the filesystem on redeploy.
 *
 * Before going to production, replace the `writeFile` block below with a
 * cloud storage upload (recommended options):
 *   • Cloudinary  — free tier, easy Next.js integration
 *   • AWS S3 / Cloudflare R2 — scalable, cost-effective
 *   • Vercel Blob — zero-config if hosting on Vercel
 *
 * The returned `url` field should then point to the CDN URL instead of
 * the local `/uploads/...` path.
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5MB

const sanitizeFileName = (fileName: string) =>
  fileName.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (session.user.role !== "LANDLORD" && session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Only landlords can upload listing files." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const category = String(formData.get("category") || "image");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file uploaded." }, { status: 400 });
    }

    const limitsByCategory = {
      image: { types: IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES },
      video: { types: VIDEO_TYPES, maxBytes: MAX_VIDEO_BYTES },
      verificationDocument: { types: DOCUMENT_TYPES, maxBytes: MAX_DOCUMENT_BYTES },
    } as const;

    const categoryRules = limitsByCategory[category as keyof typeof limitsByCategory];
    if (!categoryRules) {
      return NextResponse.json({ success: false, error: "Invalid file category." }, { status: 400 });
    }

    if (!categoryRules.types.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Unsupported file type." }, { status: 400 });
    }

    if (file.size > categoryRules.maxBytes) {
      return NextResponse.json({ success: false, error: "File exceeds size limit." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = path.extname(file.name) || "";
    const finalName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(path.basename(file.name, extension))}${extension}`;
    const uploadFolder = path.join(process.cwd(), "public", "uploads", category);

    await mkdir(uploadFolder, { recursive: true });
    await writeFile(path.join(uploadFolder, finalName), bytes);

    return NextResponse.json({
      success: true,
      data: {
        name: file.name,
        type: category,
        mimeType: file.type,
        size: file.size,
        url: `/uploads/${category}/${finalName}`,
      },
    });
  } catch (error) {
    console.error("[UPLOAD POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Failed to upload file." }, { status: 500 });
  }
}
