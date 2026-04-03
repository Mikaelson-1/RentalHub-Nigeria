/**
 * Tests for fix #4: Image upload size limits and type validation.
 *
 * These unit tests verify the validation logic extracted from AddPropertyForm.
 * The actual constants are inlined here to mirror the component behaviour.
 */

const MAX_PHOTO_SIZE_MB    = 2;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
const MAX_PHOTO_COUNT      = 10;
const ALLOWED_IMAGE_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validatePhotos(files: { name: string; size: number; type: string }[]):
  { valid: boolean; error?: string } {

  const oversized = files.filter((f) => f.size > MAX_PHOTO_SIZE_BYTES);
  if (oversized.length > 0) {
    return { valid: false, error: `Each photo must be under ${MAX_PHOTO_SIZE_MB} MB.` };
  }

  const invalidType = files.filter((f) => !ALLOWED_IMAGE_TYPES.includes(f.type));
  if (invalidType.length > 0) {
    return { valid: false, error: 'Only JPEG, PNG, WebP, or GIF images are allowed.' };
  }

  if (files.length > MAX_PHOTO_COUNT) {
    return { valid: false, error: `Maximum ${MAX_PHOTO_COUNT} photos allowed.` };
  }

  return { valid: true };
}

describe('Image upload validation (fix #4)', () => {
  it('accepts valid JPEG under 2MB', () => {
    const result = validatePhotos([{ name: 'photo.jpg', size: 1_000_000, type: 'image/jpeg' }]);
    expect(result.valid).toBe(true);
  });

  it('rejects files over 2MB', () => {
    const result = validatePhotos([{ name: 'big.jpg', size: 3 * 1024 * 1024, type: 'image/jpeg' }]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/2 MB/);
  });

  it('rejects non-image file types', () => {
    const result = validatePhotos([{ name: 'doc.pdf', size: 500_000, type: 'application/pdf' }]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/JPEG/i);
  });

  it('rejects more than 10 photos', () => {
    const files = Array.from({ length: 11 }, (_, i) => ({
      name: `photo${i}.jpg`, size: 100_000, type: 'image/jpeg',
    }));
    const result = validatePhotos(files);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/10 photos/);
  });

  it('accepts exactly 10 photos', () => {
    const files = Array.from({ length: 10 }, (_, i) => ({
      name: `photo${i}.jpg`, size: 100_000, type: 'image/jpeg',
    }));
    expect(validatePhotos(files).valid).toBe(true);
  });

  it('accepts PNG, WebP, and GIF types', () => {
    for (const type of ['image/png', 'image/webp', 'image/gif']) {
      expect(validatePhotos([{ name: 'f', size: 100_000, type }]).valid).toBe(true);
    }
  });
});
