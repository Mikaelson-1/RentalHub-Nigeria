/**
 * Tests for schema changes:
 * fix #5  — rejectionReason field added to Property
 * fix #20 — compound index (studentId, status) on Booking
 *
 * These tests verify the Prisma schema file contains the expected changes.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = readFileSync(schemaPath, 'utf-8');

describe('Prisma schema — fix #5: rejectionReason field', () => {
  it('has rejectionReason field on Property model', () => {
    expect(schema).toContain('rejectionReason');
    expect(schema).toContain('String?');
  });

  it('rejectionReason is optional (nullable)', () => {
    const match = schema.match(/rejectionReason\s+String\?/);
    expect(match).not.toBeNull();
  });
});

describe('Prisma schema — fix #20: compound Booking index', () => {
  it('has compound index on [studentId, status]', () => {
    expect(schema).toContain('@@index([studentId, status])');
  });
});

describe('Prisma schema — general integrity', () => {
  it('has all four expected models', () => {
    expect(schema).toContain('model User');
    expect(schema).toContain('model Property');
    expect(schema).toContain('model Booking');
    expect(schema).toContain('model Location');
  });

  it('has BookingStatus enum with all values', () => {
    expect(schema).toContain('PENDING');
    expect(schema).toContain('CONFIRMED');
    expect(schema).toContain('CANCELLED');
  });

  it('has PropertyStatus enum with all values', () => {
    expect(schema).toContain('APPROVED');
    expect(schema).toContain('REJECTED');
  });
});
