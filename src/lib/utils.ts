/**
 * lib/utils.ts
 *
 * General-purpose utility helpers used across the application.
 */

type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

/** Merge Tailwind class names conditionally */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const walk = (value: ClassValue): void => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      classes.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') {
      for (const [key, enabled] of Object.entries(value)) {
        if (enabled) classes.push(key);
      }
    }
  };

  inputs.forEach(walk);
  return classes.join(' ').replace(/\s+/g, ' ').trim();
}

/** Format a number as Naira */
export function formatNaira(amount: number | string | { toNumber: () => number }): string {
  const num =
    typeof amount === 'object' && 'toNumber' in amount
      ? amount.toNumber()
      : Number(amount);
  return new Intl.NumberFormat('en-NG', {
    style:    'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/** Format a date to a short readable string */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-NG', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  }).format(new Date(date));
}

/** Truncate text to a max length with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/** Parse amenities safely from JSON or string array */
export function parseAmenities(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((a) => typeof a === 'string');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Parse images safely from JSON or string array */
export function parseImages(raw: unknown): string[] {
  return parseAmenities(raw); // same logic
}

/** Get initials from a full name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Generate a slug from a string */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Build URL search params safely */
export function buildSearchParams(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      sp.set(key, String(value));
    }
  }
  return sp.toString();
}

/** Role display labels */
export const ROLE_LABELS: Record<string, string> = {
  STUDENT:  'Student',
  LANDLORD: 'Landlord',
  ADMIN:    'Admin',
};

/** Property status display labels */
export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  PENDING:  'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/** Booking status display labels */
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

/** Available amenities list */
export const AMENITIES_LIST = [
  'WiFi / Internet',
  'Electricity (NEPA)',
  'Generator Backup',
  'Borehole / Running Water',
  'Security / Fence',
  'Parking Space',
  'Kitchen',
  'Bathroom (En Suite)',
  'Air Conditioning',
  'Ceiling Fan',
  'Furnished',
  'CCTV',
  'Gated Community',
  'Close to Market',
  'Close to Main Road',
] as const;
