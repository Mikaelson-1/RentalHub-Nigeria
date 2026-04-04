import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPropertyImage } from "@/lib/property-image";
import BookButton from "@/components/BookButton";

export const dynamic = "force-dynamic";

interface PropertyDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PropertyDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    select: { title: true, description: true, price: true, location: { select: { name: true } } },
  });

  if (!property) return { title: "Property Not Found" };

  const price = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(property.price));
  const image = getPropertyImage(id);

  return {
    title: property.title,
    description: `${property.description?.slice(0, 155) ?? property.title} — ${price}/year in ${property.location.name}.`,
    openGraph: {
      title: `${property.title} | RentalHub NG`,
      description: `${property.description?.slice(0, 155) ?? property.title} — ${price}/year in ${property.location.name}.`,
      url: `https://rentalhub.ng/properties/${id}`,
      images: [{ url: image, width: 800, height: 400, alt: property.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: property.title,
      description: `${price}/year in ${property.location.name}.`,
      images: [image],
    },
  };
}

export default async function PropertyDetailsPage({ params }: PropertyDetailsPageProps) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      location: true,
      landlord: {
        select: {
          name: true,
          verificationStatus: true,
        },
      },
    },
  });

  if (!property || property.status !== "APPROVED") {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role ?? null;

  let existingBookingStatus: "PENDING" | "CONFIRMED" | "AWAITING_PAYMENT" | "PAID" | null = null;
  if (userRole === "STUDENT" && session?.user?.id) {
    const existing = await prisma.booking.findFirst({
      where: {
        studentId: session.user.id,
        propertyId: property.id,
        status: { in: ["PENDING", "CONFIRMED", "AWAITING_PAYMENT", "PAID"] },
      },
      select: { status: true },
      orderBy: { createdAt: "desc" },
    });
    existingBookingStatus = (existing?.status ?? null) as typeof existingBookingStatus;
  }

  const amenities = Array.isArray(property.amenities) ? property.amenities : [];
  const rawImages = Array.isArray(property.images) ? property.images : [];
  const imageUrls = rawImages.flatMap((imageItem) => {
    if (typeof imageItem === "string") {
      return [imageItem];
    }
    if (
      typeof imageItem === "object" &&
      imageItem !== null &&
      "url" in imageItem &&
      typeof (imageItem as { url: unknown }).url === "string"
    ) {
      return [(imageItem as { url: string }).url];
    }
    return [];
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/properties" className="text-sm text-[#E67E22] hover:underline">
          Back to properties
        </Link>

        <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6 relative h-72 rounded-xl overflow-hidden border border-gray-200">
            <Image
              src={imageUrls.length > 0 ? imageUrls[0] : getPropertyImage(property.id)}
              alt={property.title}
              fill
              className="object-cover"
              unoptimized={imageUrls.length > 0}
            />
          </div>

          <p className="text-sm text-gray-500">{property.location.name}</p>
          <h1 className="text-3xl font-bold text-[#192F59] mt-1">{property.title}</h1>
          <p className="text-[#00A553] text-2xl font-bold mt-3">
            {new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
              maximumFractionDigits: 0,
            }).format(Number(property.price))}
            <span className="text-sm font-medium text-gray-500 ml-1">/year</span>
          </p>

          <p className="text-gray-700 mt-6 leading-relaxed">{property.description}</p>

          {amenities.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-[#192F59] mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity, index) => (
                  <span key={`${amenity}-${index}`} className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full">
                    {String(amenity)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              Listed by <span className="font-medium text-gray-900">{property.landlord.name}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">Verification: {property.landlord.verificationStatus}</p>
          </div>

          <BookButton propertyId={property.id} existingBookingStatus={existingBookingStatus} userRole={userRole} />
        </div>
      </div>
    </div>
  );
}
