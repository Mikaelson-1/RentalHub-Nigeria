/**
 * prisma/demo-seed.ts
 *
 * Seeds demo users, properties, and bookings for testing all three roles.
 *
 * Demo credentials:
 *   Admin    → admin@bouesti.edu.ng    / Admin@RentalHub2024
 *   Landlord → landlord@demo.ng       / Landlord@Demo2024
 *   Student  → student@demo.ng        / Student@Demo2024
 *
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/demo-seed.ts
 */

import { PrismaClient, Role, VerificationStatus, PropertyStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    name: 'BOUESTI Admin',
    email: 'admin@bouesti.edu.ng',
    password: 'Admin@RentalHub2024',
    role: Role.ADMIN,
    verificationStatus: VerificationStatus.VERIFIED,
  },
  {
    name: 'Adebayo Olamide',
    email: 'landlord@demo.ng',
    password: 'Landlord@Demo2024',
    role: Role.LANDLORD,
    verificationStatus: VerificationStatus.VERIFIED,
  },
  {
    name: 'Chioma Eze',
    email: 'student@demo.ng',
    password: 'Student@Demo2024',
    role: Role.STUDENT,
    verificationStatus: VerificationStatus.VERIFIED,
  },
];

async function main() {
  console.log('🌱 Running demo seed...\n');

  // ── 1. Hash passwords and upsert users ──────────────────────────────────────
  console.log('👤 Creating demo users...');
  const createdUsers: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    const hashed = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password: hashed, role: u.role, verificationStatus: u.verificationStatus },
      create: { name: u.name, email: u.email, password: hashed, role: u.role, verificationStatus: u.verificationStatus },
    });
    createdUsers[u.role] = user.id;
    console.log(`  ✅ ${u.role.padEnd(8)} ${u.email}  (password: ${u.password})`);
  }

  const landlordId = createdUsers[Role.LANDLORD];
  const studentId  = createdUsers[Role.STUDENT];

  // ── 2. Get location IDs ──────────────────────────────────────────────────────
  const locations = await prisma.location.findMany({ select: { id: true, name: true } });
  if (locations.length === 0) {
    throw new Error('No locations found. Run the main seed first: npm run db:seed');
  }
  const loc = (name: string) => locations.find((l) => l.name.includes(name))?.id ?? locations[0].id;

  // ── 3. Create demo properties ────────────────────────────────────────────────
  console.log('\n🏠 Creating demo properties...');

  const properties = [
    {
      title: 'Spacious Self-Contain in Uro',
      description: 'Well-ventilated self-contain apartment just 5 minutes walk from BOUESTI main gate. Features constant water supply, 24/7 security, and a dedicated parking space. Ideal for a focused student.',
      price: 180000,
      locationId: loc('Uro'),
      distanceToCampus: 0.5,
      amenities: ['Water', 'Security', 'Parking', 'Borehole'],
      status: PropertyStatus.APPROVED,
    },
    {
      title: 'Modern 2-Bedroom Flat — Olumilua Estate',
      description: 'Tastefully finished 2-bedroom apartment in the serene Olumilua Residential Estate. Tiled floors, POP ceiling, burglar-proof doors, and a generating set. Perfect for two students sharing.',
      price: 320000,
      locationId: loc('Olumilua'),
      distanceToCampus: 1.2,
      amenities: ['Generator', 'Water', 'Security', 'Tiles', 'POP Ceiling'],
      status: PropertyStatus.APPROVED,
    },
    {
      title: 'Budget Room in Shared House — Afao Road',
      description: 'Affordable room in a clean 6-room shared compound. Shared kitchen and bathroom. Great for first-year students on a budget. Landlord lives on the premises.',
      price: 60000,
      locationId: loc('Afao'),
      distanceToCampus: 2.0,
      amenities: ['Water', 'Security'],
      status: PropertyStatus.APPROVED,
    },
    {
      title: 'Studio Apartment — Ikoyi Estate',
      description: 'Compact studio apartment with en-suite bathroom, built-in wardrobe, and ceiling fan. Quiet neighbourhood with reliable water supply. Close to Amoye Grammar School junction.',
      price: 150000,
      locationId: loc('Ikoyi'),
      distanceToCampus: 1.8,
      amenities: ['Water', 'WiFi', 'Tiles'],
      status: PropertyStatus.APPROVED,
    },
    {
      title: '3-Bedroom Flat — Ajebandele',
      description: 'Spacious 3-bedroom flat ideal for a group of students. Large living room, modern kitchen, and a big compound for outdoor activities. NEPA phase + solar backup.',
      price: 450000,
      locationId: loc('Ajebandele'),
      distanceToCampus: 1.5,
      amenities: ['Solar', 'Generator', 'Water', 'Security', 'Parking'],
      status: PropertyStatus.PENDING,
    },
    {
      title: 'Room & Parlour — Odo Oja',
      description: 'Neat room and parlour just behind Odo Oja market. Very close to campus with excellent connectivity to the town centre. Best for students who want walkable access to amenities.',
      price: 90000,
      locationId: loc('Odo Oja'),
      distanceToCampus: 0.8,
      amenities: ['Water', 'Security'],
      status: PropertyStatus.REJECTED,
      rejectionReason: 'Property photos do not match the description. Please resubmit with accurate images.',
    },
  ];

  const createdPropertyIds: string[] = [];

  for (const prop of properties) {
    const { rejectionReason, ...rest } = prop as typeof prop & { rejectionReason?: string };
    const existing = await prisma.property.findFirst({
      where: { title: prop.title, landlordId },
    });
    if (existing) {
      createdPropertyIds.push(existing.id);
      console.log(`  ⚠️  Already exists: ${prop.title}`);
      continue;
    }
    const created = await prisma.property.create({
      data: {
        ...rest,
        price: prop.price,
        landlordId,
        amenities: prop.amenities,
        images: [],
        ...(rejectionReason ? { rejectionReason } : {}),
      },
    });
    createdPropertyIds.push(created.id);
    console.log(`  ✅ [${prop.status.padEnd(8)}] ${prop.title}`);
  }

  // ── 4. Create demo bookings ──────────────────────────────────────────────────
  console.log('\n📅 Creating demo bookings...');

  const approvedIds = createdPropertyIds.slice(0, 4); // first 4 are APPROVED
  const bookingDefs = [
    { propertyId: approvedIds[0], status: BookingStatus.CONFIRMED },
    { propertyId: approvedIds[1], status: BookingStatus.PENDING },
    { propertyId: approvedIds[2], status: BookingStatus.CANCELLED },
  ];

  for (const b of bookingDefs) {
    if (!b.propertyId) continue;
    const existing = await prisma.booking.findFirst({
      where: { studentId, propertyId: b.propertyId },
    });
    if (existing) {
      console.log(`  ⚠️  Booking already exists for property ${b.propertyId}`);
      continue;
    }
    await prisma.booking.create({ data: { studentId, propertyId: b.propertyId, status: b.status } });
    console.log(`  ✅ [${b.status.padEnd(9)}] booked property ${b.propertyId.slice(0, 8)}…`);
  }

  // ── 5. Summary ──────────────────────────────────────────────────────────────
  console.log('\n✨ Demo seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ROLE       EMAIL                     PASSWORD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const u of DEMO_USERS) {
    console.log(`  ${u.role.padEnd(10)} ${u.email.padEnd(32)} ${u.password}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => { console.error('❌ Demo seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
