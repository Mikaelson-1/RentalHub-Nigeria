import { Prisma } from "@prisma/client";

export const BOOKING_WITH_RELATIONS = {
  student: { select: { id: true, name: true, email: true } },
  property: {
    include: {
      location: { select: { id: true, name: true, classification: true } },
      landlord: { select: { id: true, name: true, email: true } },
    },
  },
} satisfies Prisma.BookingInclude;

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof BOOKING_WITH_RELATIONS;
}>;

export const USER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  profileImage: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserProfile = Prisma.UserGetPayload<{
  select: typeof USER_PROFILE_SELECT;
}>;

export const PROPERTY_WITH_LANDLORD = {
  location: { select: { id: true, name: true, classification: true } },
  landlord: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PropertyInclude;

export type PropertyWithLandlord = Prisma.PropertyGetPayload<{
  include: typeof PROPERTY_WITH_LANDLORD;
}>;

export const PROPERTY_WITH_COUNTS = {
  location: { select: { id: true, name: true, classification: true } },
  landlord: { select: { id: true, name: true, email: true } },
  _count: { select: { bookings: true } },
} satisfies Prisma.PropertyInclude;

export type PropertyWithCounts = Prisma.PropertyGetPayload<{
  include: typeof PROPERTY_WITH_COUNTS;
}>;

export const LANDLORD_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  profileImage: true,
  avatarUrl: true,
  bankName: true,
  accountNumber: true,
  accountName: true,
  verificationStatus: true,
  verifiedAt: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type LandlordProfile = Prisma.UserGetPayload<{
  select: typeof LANDLORD_PROFILE_SELECT;
}>;

export const STUDENT_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  profileImage: true,
  avatarUrl: true,
  school: true,
  matNumber: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type StudentProfile = Prisma.UserGetPayload<{
  select: typeof STUDENT_PROFILE_SELECT;
}>;

export const LOCATION_WITH_PROPERTIES = {
  properties: {
    where: { status: "APPROVED" },
    select: {
      id: true,
      title: true,
      price: true,
      images: true,
      amenities: true,
      landlord: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.LocationInclude;

export type LocationWithProperties = Prisma.LocationGetPayload<{
  include: typeof LOCATION_WITH_PROPERTIES;
}>;

export const NOTIFICATION_WITH_ACTOR = {
  actor: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.NotificationInclude;

export type NotificationWithActor = Prisma.NotificationGetPayload<{
  include: typeof NOTIFICATION_WITH_ACTOR;
}>;
