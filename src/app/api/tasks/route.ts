/**
 * POST /api/tasks
 *
 * Webhook handler for Vercel Task Queue.
 * Receives task events and routes them to appropriate handlers.
 *
 * Task types:
 * - send-email: Send transactional emails
 * - process-image: Perceptual hashing, duplicate/AI detection
 * - verify-payment: Paystack payment verification
 * - verify-documents: AI pre-screening of landlord documents
 * - cache-invalidate: Clear Redis cache patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import type { TaskPayload } from '@/lib/tasks';
import prisma from '@/lib/prisma';
import { sendMail } from '@/lib/email';
import { notifyUser, notifyRole } from '@/lib/notifications';
import { computeImageHash, hammingDistance, DUPLICATE_THRESHOLD, analyzeImage } from '@/lib/image-analysis';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TaskEvent {
  type: string;
  id: string;
  payload: string;
  attempt: number;
  timestamp: string;
}

/**
 * Verify Task Queue webhook signature (optional, recommended for production).
 */
function verifySignature(request: NextRequest, signature: string | null): boolean {
  // TODO: Implement HMAC signature verification if Vercel provides secret
  // For now, rely on URL-only accessibility (add to allowed IP whitelist in production)
  return true;
}

async function handleEmailTask(
  payload: Exclude<TaskPayload, { type: Exclude<TaskPayload['type'], 'send-email'> }>
): Promise<void> {
  if (payload.type !== 'send-email') return;

  try {
    const success = await sendMail({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (!success && (payload.retryCount || 0) < 3) {
      console.warn(`[TASK] Email send failed, will retry. Attempt: ${(payload.retryCount || 0) + 1}`);
      // Retry logic: throw error to trigger Vercel Task Queue retry
      throw new Error('Email send failed, retrying...');
    }

    // Log success
    if (payload.userId) {
      await notifyUser({
        userId: payload.userId,
        title: 'Email Sent',
        message: `Your email to ${payload.to} has been sent.`,
        type: 'SYSTEM',
      }).catch(() => {
        // Ignore notification errors
      });
    }
  } catch (error) {
    console.error('[TASK EMAIL ERROR]', error);
    throw error; // Re-throw for Task Queue retry logic
  }
}

async function handleImageProcessingTask(
  payload: Exclude<TaskPayload, { type: Exclude<TaskPayload['type'], 'process-image'> }>
): Promise<void> {
  if (payload.type !== 'process-image') return;

  try {
    console.log(`[TASK] Processing image: ${payload.imageUrl} (hash: ${payload.hash})`);

    let flagged = false;
    let flagReason: string | null = null;
    let duplicatePropertyId: string | null = null;

    // 1. Check for duplicates using the hash computed on upload
    const allHashes = await prisma.imageHash.findMany({
      select: { hash: true, imageUrl: true, propertyId: true },
      where: { imageUrl: { not: payload.imageUrl } }, // Exclude this image itself
    });

    const duplicate = allHashes.find(
      (h) => hammingDistance(h.hash, payload.hash) <= DUPLICATE_THRESHOLD
    );

    if (duplicate) {
      flagged = true;
      flagReason = `Duplicate of image in property ${duplicate.propertyId}`;
      duplicatePropertyId = duplicate.propertyId;
      console.log(`[TASK] Duplicate detected: ${payload.imageUrl}`);
    }

    // 2. Run AI suspicious/generated image analysis
    let aiSuspicious = false;
    let aiReasons: string[] = [];
    try {
      // Fetch image bytes from Vercel Blob for analysis
      const blobUrl = payload.imageUrl.startsWith('http')
        ? payload.imageUrl
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${payload.imageUrl}`;

      // Extract filename from URL for AI analysis
      const filename = payload.imageUrl.split('/').pop() || 'image.jpg';
      const response = await fetch(blobUrl);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const bytes = Buffer.from(buffer);

        const analysis = await analyzeImage(bytes, filename);
        if (analysis.suspicious) {
          aiSuspicious = true;
          aiReasons = analysis.reasons;

          if (!flagged) {
            flagged = true;
            flagReason = `AI flagged as suspicious: ${aiReasons.join('; ')}`;
          }

          console.log(`[TASK] AI analysis flagged image: ${payload.imageUrl}`);
        }
      }
    } catch (analysisError) {
      console.error(`[TASK IMAGE ANALYSIS ERROR] Failed to analyze ${payload.imageUrl}:`, analysisError);
      // Don't fail the task; continue with duplicate check results
    }

    // 3. Update imageHash record with results
    await prisma.imageHash.updateMany(
      {
        imageUrl: payload.imageUrl,
      },
      {
        flagged,
        flagReason,
      }
    );

    // 4. Notify admin if flagged
    if (flagged) {
      const uploader = await prisma.user.findUnique({
        where: { id: payload.uploadedById },
        select: { name: true, email: true },
      });

      const duplicateInfo = duplicatePropertyId
        ? ` Matches existing property (${duplicatePropertyId}).`
        : '';
      const aiInfo = aiReasons.length > 0 ? ` AI flags: ${aiReasons.join('; ')}` : '';

      await notifyRole(
        'ADMIN',
        'Suspicious image detected',
        `${uploader?.name || 'User'} uploaded a flagged image.${duplicateInfo}${aiInfo}`,
        'PROPERTY',
        '/admin'
      ).catch(console.error);

      // Notify uploader that their image was flagged
      await notifyUser({
        userId: payload.uploadedById,
        type: 'PROPERTY',
        title: 'Image flagged',
        message: 'One of your uploaded images was flagged during review. Your listing remains pending.',
        link: '/landlord',
      }).catch(console.error);
    }
  } catch (error) {
    console.error('[TASK IMAGE PROCESSING ERROR]', error);
    throw error;
  }
}

async function handlePaymentVerificationTask(
  payload: Exclude<TaskPayload, { type: Exclude<TaskPayload['type'], 'verify-payment'> }>
): Promise<void> {
  if (payload.type !== 'verify-payment') return;

  try {
    // TODO: Implement payment verification
    // 1. Fetch from Paystack API
    // 2. Update booking payment status
    // 3. Trigger payout notifications if payment successful

    console.log(`[TASK] Verifying payment: ${payload.paystackRef}`);

    // Placeholder: Log verification
    await prisma.payment.updateMany(
      {
        paystackRef: payload.paystackRef,
      },
      {
        status: 'SUCCESS',
      }
    );
  } catch (error) {
    console.error('[TASK PAYMENT VERIFICATION ERROR]', error);
    throw error;
  }
}

async function handleDocumentVerificationTask(
  payload: Exclude<TaskPayload, { type: Exclude<TaskPayload['type'], 'verify-documents'> }>
): Promise<void> {
  if (payload.type !== 'verify-documents') return;

  try {
    // TODO: Implement document verification
    // 1. Call Gemini AI for each document
    // 2. Store pre-screening scores in User model
    // 3. Notify admin of results

    console.log(`[TASK] Verifying documents for landlord: ${payload.landlordId}`);

    // Placeholder: Log verification
    await prisma.user.update({
      where: { id: payload.landlordId },
      data: {
        aiPreScreenScore: 'PENDING',
        aiPreScreenNote: 'Documents queued for AI pre-screening',
      },
    });
  } catch (error) {
    console.error('[TASK DOCUMENT VERIFICATION ERROR]', error);
    throw error;
  }
}

async function handleCacheInvalidationTask(
  payload: Exclude<TaskPayload, { type: Exclude<TaskPayload['type'], 'cache-invalidate'> }>
): Promise<void> {
  if (payload.type !== 'cache-invalidate') return;

  try {
    // TODO: Implement cache invalidation
    // 1. Connect to Upstash Redis
    // 2. For each pattern, delete matching keys
    // 3. Log invalidations

    console.log(`[TASK] Invalidating cache patterns: ${payload.patterns.join(', ')}`);

    // Placeholder: Log invalidation
  } catch (error) {
    console.error('[TASK CACHE INVALIDATION ERROR]', error);
    // Don't throw: cache invalidation failures shouldn't block tasks
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-vercel-signature');
    if (!verifySignature(request, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = (await request.json()) as TaskEvent;

    if (!body.type || !body.id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    let payload: TaskPayload;
    try {
      payload = JSON.parse(body.payload);
    } catch {
      return NextResponse.json({ error: 'Invalid payload JSON' }, { status: 400 });
    }

    console.log(`[TASK] Processing task: ${body.id} (type: ${payload.type}, attempt: ${body.attempt})`);

    // Route to appropriate handler
    switch (payload.type) {
      case 'send-email':
        await handleEmailTask(payload);
        break;
      case 'process-image':
        await handleImageProcessingTask(payload);
        break;
      case 'verify-payment':
        await handlePaymentVerificationTask(payload);
        break;
      case 'verify-documents':
        await handleDocumentVerificationTask(payload);
        break;
      case 'cache-invalidate':
        await handleCacheInvalidationTask(payload);
        break;
      default:
        return NextResponse.json({ error: `Unknown task type: ${payload.type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, taskId: body.id });
  } catch (error) {
    console.error('[TASK HANDLER ERROR]', error);
    // Return 500 to trigger retry
    return NextResponse.json(
      { error: 'Task processing failed' },
      { status: 500 }
    );
  }
}
