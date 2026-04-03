"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

interface Listing {
  id: string;
  title: string;
  price: number | string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  location: {
    name: string;
  };
  _count?: {
    bookings: number;
  };
}

interface BookingRequest {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
  student: {
    name: string;
  };
  property: {
    title: string;
  };
}

interface ListingsResponse {
  success: boolean;
  data?: {
    items: Listing[];
  };
  error?: string;
}

interface BookingsResponse {
  success: boolean;
  data?: {
    items: BookingRequest[];
    total: number;
    totalPages: number;
  };
  error?: string;
}

export default function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState<"listings" | "requests">("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingBookingId, setUpdatingBookingId] = useState("");

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [listingsResponse, requestsResponse] = await Promise.all([
        fetch("/api/properties?mine=true&pageSize=50", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
      ]);

      const listingsPayload = (await listingsResponse.json()) as ListingsResponse;
      const requestsPayload = (await requestsResponse.json()) as BookingsResponse;

      if (!listingsResponse.ok || !listingsPayload.success) {
        throw new Error(listingsPayload.error || "Failed to load your listings.");
      }

      if (!requestsResponse.ok || !requestsPayload.success) {
        throw new Error(requestsPayload.error || "Failed to load tenant requests.");
      }

      setListings(listingsPayload.data?.items ?? []);
      setRequests(requestsPayload.data?.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load landlord dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const totalViews = useMemo(
    () => listings.reduce((acc, listing) => acc + (listing._count?.bookings ?? 0), 0),
    [listings],
  );

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "PENDING").length,
    [requests],
  );

  const updateBookingStatus = async (bookingId: string, status: "CONFIRMED" | "CANCELLED") => {
    setUpdatingBookingId(bookingId);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Failed to ${status.toLowerCase()} booking.`);
      }
      await loadDashboardData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update booking.");
    } finally {
      setUpdatingBookingId("");
    }
  };

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(price));

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">Landlord Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your listings and tenant requests</p>
        </div>
        <Link
          href="/landlord/add-property"
          className="bg-[#E67E22] hover:bg-[#D35400] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Add Property
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">{listings.length}</div>
          <div className="text-gray-600">Total Listings</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">
            {listings.filter((listing) => listing.status === "APPROVED").length}
          </div>
          <div className="text-gray-600">Approved</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">{pendingRequests}</div>
          <div className="text-gray-600">Pending Requests</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">{totalViews}</div>
          <div className="text-gray-600">Total Booking Requests</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("listings")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "listings"
                  ? "border-primary-green text-primary-green"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Listings
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "requests"
                  ? "border-primary-green text-primary-green"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Tenant Requests
              {pendingRequests > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {pendingRequests}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading dashboard...</div>
          ) : activeTab === "listings" ? (
            listings.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No listings yet. Add your first property.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((listing) => (
                      <tr key={listing.id} className="border-b border-gray-100">
                        <td className="py-4 px-4 font-medium text-navy">{listing.title}</td>
                        <td className="py-4 px-4 text-gray-600">{listing.location.name}</td>
                        <td className="py-4 px-4 text-primary-green font-medium">{formatPrice(listing.price)}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              listing.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : listing.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {listing.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {listing._count?.bookings ?? 0}
                          {listing.status === "REJECTED" && listing.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">
                              Reason: {listing.rejectionReason}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No tenant requests yet.</div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold text-navy">{request.student.name}</h3>
                    <p className="text-gray-600 text-sm">Interested in: {request.property.title}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Requested on {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === "CONFIRMED"
                          ? "bg-green-100 text-green-800"
                          : request.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {request.status}
                    </span>
                    {request.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => updateBookingStatus(request.id, "CONFIRMED")}
                          disabled={updatingBookingId === request.id}
                          title="Confirm booking"
                          className="p-1.5 rounded-full bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateBookingStatus(request.id, "CANCELLED")}
                          disabled={updatingBookingId === request.id}
                          title="Cancel booking"
                          className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
