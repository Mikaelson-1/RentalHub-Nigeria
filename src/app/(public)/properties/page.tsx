import Link from "next/link";
import prisma from "@/lib/prisma";
import { SCHOOL_LOCATION_KEYWORDS } from "@/lib/schools";

export const dynamic = "force-dynamic";

interface PropertiesPageProps {
  searchParams?: Promise<{
    location?: string;
    school?: string;
  }>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const schoolFilter = resolvedSearchParams?.school?.trim() || "";
  const locationFilter = resolvedSearchParams?.location?.trim() || "";
  const activeFilter = schoolFilter || locationFilter;
  const selectedKeywords = schoolFilter ? SCHOOL_LOCATION_KEYWORDS[schoolFilter] ?? [schoolFilter] : [locationFilter];
  const locationNameFilters = selectedKeywords
    .map((keyword) => keyword.trim())
    .filter((keyword): keyword is string => Boolean(keyword));

  const properties = await prisma.property.findMany({
    where: {
      status: "APPROVED",
      ...(activeFilter && {
        location: {
          OR: locationNameFilters.map((keyword) => ({
            name: {
              contains: keyword,
              mode: "insensitive" as const,
            },
          })),
        },
      }),
    },
    include: {
      location: true,
      landlord: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#192F59]">Available Properties</h1>
          <p className="text-gray-600 mt-2">
            Browse verified off-campus accommodation around BOUESTI.
          </p>
          {activeFilter && (
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1 text-xs font-medium">
                {schoolFilter ? `School: ${schoolFilter}` : `Location: ${locationFilter}`}
              </span>
              <Link href="/properties" className="text-xs text-[#192F59] hover:text-[#E67E22] transition-colors">
                Clear filter
              </Link>
            </div>
          )}
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-600">
              {activeFilter
                ? `No approved properties found for ${schoolFilter || locationFilter}.`
                : "No approved properties are available yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div key={property.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <p className="text-sm text-gray-500">{property.location.name}</p>
                <h2 className="text-lg font-semibold text-[#192F59] mt-1">{property.title}</h2>
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">{property.description}</p>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[#00A553] font-bold text-xl">
                    {new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: "NGN",
                      maximumFractionDigits: 0,
                    }).format(Number(property.price))}
                  </p>
                  <Link
                    href={`/properties/${property.id}`}
                    className="bg-[#192F59] hover:bg-[#0f1d3a] text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
