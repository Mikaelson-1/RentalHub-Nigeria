/**
 * src/lib/tasks.ts
 *
 * Wrapper around Vercel Task Queue for background job processing.
 * Supports task types: email sending, image processing, payment verification, etc.
 *
 * Usage:
 *   const taskId = await enqueueTask('send-email', {
 *     to: 'user@example.com',
 *     subject: 'Welcome',
 *     template: 'welcome',
 *   });
 */

export type TaskType =
  | 'send-email'
  | 'process-image'
  | 'verify-payment'
  | 'verify-documents'
  | 'generate-description'
  | 'cache-invalidate';

export interface EmailTaskPayload {
  type: 'send-email';
  to: string;
  subject: string;
  html: string;
  bookingId?: string;
  userId?: string;
  retryCount?: number;
}

export interface ImageProcessingPayload {
  type: 'process-image';
  imageUrl: string;
  propertyId?: string;
  uploadedById: string;
  hash: string;
  retryCount?: number;
}

export interface PaymentVerificationPayload {
  type: 'verify-payment';
  paystackRef: string;
  bookingId: string;
  retryCount?: number;
}

export interface DocumentVerificationPayload {
  type: 'verify-documents';
  landlordId: string;
  documentUrls: string[];
  retryCount?: number;
}

export interface CacheInvalidationPayload {
  type: 'cache-invalidate';
  patterns: string[];
}

export type TaskPayload =
  | EmailTaskPayload
  | ImageProcessingPayload
  | PaymentVerificationPayload
  | DocumentVerificationPayload
  | CacheInvalidationPayload;

export interface TaskResult {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

/**
 * Enqueue a task for background processing via Vercel Task Queue.
 * Returns immediately; task executes asynchronously.
 */
export async function enqueueTask<T extends TaskPayload>(payload: T): Promise<TaskResult> {
  try {
    const response = await fetch('https://api.vercel.com/v1/projects/current/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TASK_QUEUE_TOKEN || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: payload.type,
        payload: JSON.stringify(payload),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[TASK QUEUE ERROR]', response.status, error);
      throw new Error(`Failed to enqueue task: ${error}`);
    }

    const data = (await response.json()) as { id: string };

    return {
      id: data.id,
      status: 'pending',
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('[TASK ENQUEUE ERROR]', error);
    // Fail-open: if Task Queue is down, log but don't crash
    // In production, consider storing failed tasks for retry
    throw error;
  }
}

/**
 * Convenience wrapper for email tasks.
 */
export async function enqueueEmail(
  to: string,
  subject: string,
  html: string,
  metadata?: { bookingId?: string; userId?: string }
): Promise<TaskResult> {
  return enqueueTask({
    type: 'send-email',
    to,
    subject,
    html,
    bookingId: metadata?.bookingId,
    userId: metadata?.userId,
  } as EmailTaskPayload);
}

/**
 * Convenience wrapper for image processing tasks.
 */
export async function enqueueImageProcessing(
  imageUrl: string,
  hash: string,
  uploadedById: string,
  propertyId?: string
): Promise<TaskResult> {
  return enqueueTask({
    type: 'process-image',
    imageUrl,
    hash,
    uploadedById,
    propertyId,
  } as ImageProcessingPayload);
}

/**
 * Convenience wrapper for cache invalidation.
 */
export async function invalidateCacheAsync(patterns: string[]): Promise<TaskResult> {
  return enqueueTask({
    type: 'cache-invalidate',
    patterns,
  } as CacheInvalidationPayload);
}
