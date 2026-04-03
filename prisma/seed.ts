/**
 * prisma/seed.ts
 *
 * Seeds the database with:
 *  1. Ikere-Ekiti area locations around BOUESTI campus
 *  2. A default Admin user
 *
 * Run:  npm run db:seed
 *       or: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
 */

import { PrismaClient, Role, VerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Location data ─────────────────────────────────────────────────────────────

interface LocationSeed {
  name: string;
  classification: string;
}

const IKERE_LOCATIONS: LocationSeed[] = [
  {
    name: 'Uro',
    classification: 'Core Quarter',
  },
  {
    name: 'Odo Oja',
    classification: 'Core Quarter',
  },
  {
    name: "Oke 'Kere",
    classification: 'Neighbourhood',
  },
  {
    name: 'Afao',
    classification: 'Ward',
  },
  {
    name: 'Olumilua Area',
    classification: 'Residential Estate',
  },
  {
    name: 'Ajebandele',
    classification: 'Neighbourhood',
  },
  {
    name: 'Ikoyi Estate',
    classification: 'Residential Estate',
  },
  {
    name: 'Amoye Grammar School Area',
    classification: 'Neighbourhood',
  },
];

// ── Admin user data ───────────────────────────────────────────────────────────

const ADMIN_USER = {
  name: 'BOUESTI Admin',
  email: process.env.ADMIN_EMAIL ?? 'admin@bouesti.edu.ng',
  // Set ADMIN_SEED_PASSWORD in your environment before running the seed.
  // Never commit a real password here.
  password: process.env.ADMIN_SEED_PASSWORD ?? (() => { throw new Error('ADMIN_SEED_PASSWORD env var is required'); })(),
  role: Role.ADMIN,
  verificationStatus: VerificationStatus.VERIFIED,
};

// ── Seed functions ────────────────────────────────────────────────────────────

async function seedLocations(): Promise<void> {
  console.log('📍 Seeding Ikere-Ekiti locations...');

  for (const location of IKERE_LOCATIONS) {
    const result = await prisma.location.upsert({
      where: { name: location.name },
      update: {
        classification: location.classification,
      },
      create: {
        name: location.name,
        classification: location.classification,
      },
    });
    console.log(`  ✅ ${result.name} (${result.classification})`);
  }

  const total = await prisma.location.count();
  console.log(`\n  Total locations in DB: ${total}`);
}

async function seedAdminUser(): Promise<void> {
  console.log('\n👤 Seeding default Admin user...');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_USER.email },
  });

  if (existingAdmin) {
    console.log(`  ⚠️  Admin user already exists: ${ADMIN_USER.email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_USER.password, 12);

  const admin = await prisma.user.create({
    data: {
      name: ADMIN_USER.name,
      email: ADMIN_USER.email,
      password: hashedPassword,
      role: ADMIN_USER.role,
      verificationStatus: ADMIN_USER.verificationStatus,
    },
  });

  console.log(`  ✅ Admin user created:`);
  console.log(`     Name  : ${admin.name}`);
  console.log(`     Email : ${admin.email}`);
  console.log(`     Role  : ${admin.role}`);
  console.log(`     Status: ${admin.verificationStatus}`);
  console.log(`\n  ⚠️  Remember to change the admin password after first login!`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Starting database seed for RentalHub-BOUESTI...\n');

  await seedLocations();
  await seedAdminUser();

  console.log('\n✨ Database seeding completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
