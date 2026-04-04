"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SCHOOL_OPTIONS } from "@/lib/schools";

interface AdminSummary {
  totalProperties: number;
  pendingApprovals: number;
  totalUsers: number;
  totalBookings: number;
}

interface PropertyItem {
  id: string;
  title: string;
  price: number | string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  images: unknown;
  landlord: {
    name: string;
    email: string;
  };
  location: {
    name: string;
  };
  _count?: {
    bookings: number;
  };
}

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "LANDLORD" | "ADMIN";
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "SUSPENDED";
  createdAt: string;
  _count?: {
    properties: number;
    bookings: number;
  };
}

interface AdminBookingItem {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
  student: {
    name: string;
    email: string;
  };
  property: {
    id: string;
    title: string;
    location: {
      name: string;
    };
    landlord: {
      name: string;
      email: string;
    };
  };
}

interface AdminSummaryResponse {
  success: boolean;
  data?: AdminSummary;
  error?: string;
}

interface PropertiesResponse {
  success: boolean;
  data?: {
    items: PropertyItem[];
    total: number;
  };
  error?: string;
}

interface UsersResponse {
  success: boolean;
  data?: AdminUserItem[];
  error?: string;
}

interface BookingsResponse {
  success: boolean;
  data?: AdminBookingItem[];
  error?: string;
}

type AdminPanel = "properties" | "pending" | "users" | "bookings";
type PropertyFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const initialSummary: AdminSummary = {
  totalProperties: 0,
  pendingApprovals: 0,
  totalUsers: 0,
  totalBookings: 0,
};

export default function AdminDashboard() {
  const [selectedSchool, setSelectedSchool] = useState<string>("ALL");
  const [summary, setSummary] = useState<AdminSummary>(initialSummary);
  const [allProperties, setAllProperties] = useState<PropertyItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [activePanel, setActivePanel] = useState<AdminPanel>("pending");
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadAdminData = useCallback(async (school: string) => {
    setIsLoading(true);
    setError("");

    const schoolParam = school !== "ALL" ? `&school=${encodeURIComponent(school)}` : "";
    const propSchoolParam = school !== "ALL" ? `&school=${encodeURIComponent(school)}` : "";

    try {
      const [
        summaryResponse,
        pendingResponse,
        approvedResponse,
        rejectedResponse,
        usersResponse,
        bookingsResponse,
      ] = await Promise.all([
        fetch(`/api/admin/summary?t=${Date.now()}${schoolParam}`, { cache: "no-store" }),
        fetch(`/api/properties?status=PENDING&pageSize=100${propSchoolParam}`, { cache: "no-store" }),
        fetch(`/api/properties?status=APPROVED&pageSize=100${propSchoolParam}`, { cache: "no-store" }),
        fetch(`/api/properties?status=REJECTED&pageSize=100${propSchoolParam}`, { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch(`/api/admin/bookings?t=${Date.now()}${schoolParam}`, { cache: "no-store" }),
      ]);

      const summaryPayload = (await summaryResponse.json()) as AdminSummaryResponse;
      const pendingPayload = (await pendingResponse.json()) as PropertiesResponse;
      const approvedPayload = (await approvedResponse.json()) as PropertiesResponse;
      const rejectedPayload = (await rejectedResponse.json()) as PropertiesResponse;
      const usersPayload = (await usersResponse.json()) as UsersResponse;
      const bookingsPayload = (await bookingsResponse.json()) as BookingsResponse;

      if (!summaryResponse.ok || !summaryPayload.success || !summaryPayload.data) {
        throw new Error(summaryPayload.error || "Could not load admin summary.");
      }
      if (!pendingResponse.ok || !pendingPayload.success) {
        throw new Error(pendingPayload.error || "Could not load pending properties.");
      }
      if (!approvedResponse.ok || !approvedPayload.success) {
        throw new Error(approvedPayload.error || "Could not load approved properties.");
      }
      if (!rejectedResponse.ok || !rejectedPayload.success) {
        throw new Error(rejectedPayload.error || "Could not load rejected properties.");
      }
      if (!usersResponse.ok || !usersPayload.success) {
        throw new Error(usersPayload.error || "Could not load users.");
      }
      if (!bookingsResponse.ok || !bookingsPayload.success) {
        throw new Error(bookingsPayload.error || "Could not load bookings.");
      }

      const combinedProperties = [
        ...(pendingPayload.data?.items ?? []),
        ...(approvedPayload.data?.items ?? []),
        ...(rejectedPayload.data?.items ?? []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setSummary(summaryPayload.data);
      setAllProperties(combinedProperties);
      setUsers(usersPayload.data ?? []);
      setBookings(bookingsPayload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load admin data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData(selectedSchool);
  }, [loadAdminData, selectedSchool]);

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(price));

  const getImageCount = (images: unknown) => (Array.isArray(images) ? images.length : 0);

  const pendingProperties = useMemo(
    () => allProperties.filter((property) => property.status === "PENDING"),
    [allProperties],
  );

  const filteredProperties = useMemo(() => {
    if (propertyFilter === "ALL") {
      return allProperties;
    }
    return allProperties.filter((property) => property.status === propertyFilter);
  }, [allProperties, propertyFilter]);

  const updatePropertyStatus = async (propertyId: string, status: "APPROVED" | "REJECTED") => {
    setUpdatingId(propertyId);
    setError("");
    try {
      const response = await fetch(`/api/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `Failed to ${status.toLowerCase()} listing.`);
      }
      await loadAdminData(selectedSchool);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update status.");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage properties, users, and platform settings</p>
        </div>

        {/* School selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="school-select" className="text-sm font-medium text-gray-600 whitespace-nowrap">
            Viewing school:
          </label>
          <select
            id="school-select"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#192F59]/30 min-w-[220px]"
          >
            <option value="ALL">All Schools</option>
            {SCHOOL_OPTIONS.map((school) => (
              <option key={school.value} value={school.value}>
                {school.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSchool !== "ALL" && (
        <div className="mb-5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-[#192F59]/10 text-[#192F59] text-sm font-medium px-3 py-1.5 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {selectedSchool}
          </span>
          <button
            onClick={() => setSelectedSchool("ALL")}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <button
          onClick={() => setActivePanel("properties")}
          className={`bg-white p-6 rounded-xl shadow-sm text-left hover:shadow-md transition-shadow ${
            activePanel === "properties" ? "ring-2 ring-[#192F59]/20" : ""
          }`}
        >
          <div className="text-3xl font-bold text-primary-green">{summary.totalProperties}</div>
          <div className="text-gray-600">Total Properties</div>
        </button>

        <button
          onClick={() => setActivePanel("pending")}
          className={`bg-white p-6 rounded-xl shadow-sm border-2 border-yellow-200 text-left hover:shadow-md transition-shadow ${
            activePanel === "pending" ? "ring-2 ring-yellow-400/30" : ""
          }`}
        >
          <div className="text-3xl font-bold text-yellow-600">{summary.pendingApprovals}</div>
          <div className="text-gray-600">Pending Approvals</div>
        </button>

        <button
          onClick={() => setActivePanel("users")}
          className={`bg-white p-6 rounded-xl shadow-sm text-left hover:shadow-md transition-shadow ${
            activePanel === "users" ? "ring-2 ring-[#192F59]/20" : ""
          }`}
        >
          <div className="text-3xl font-bold text-primary-green">{summary.totalUsers}</div>
          <div className="text-gray-600">Total Users</div>
        </button>

        <button
          onClick={() => setActivePanel("bookings")}
          className={`bg-white p-6 rounded-xl shadow-sm text-left hover:shadow-md transition-shadow ${
            activePanel === "bookings" ? "ring-2 ring-[#192F59]/20" : ""
          }`}
        >
          <div className="text-3xl font-bold text-primary-green">{summary.totalBookings}</div>
          <div className="text-gray-600">Total Bookings</div>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-navy">
              {activePanel === "properties" && "All Properties"}
              {activePanel === "pending" && "Pending Approvals"}
              {activePanel === "users" && "All Users"}
              {activePanel === "bookings" && "All Bookings"}
            </h2>

            {activePanel === "pending" && pendingProperties.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                {pendingProperties.length} pending
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-10 text-gray-500">Loading admin data...</div>
          ) : activePanel === "pending" ? (
            pendingProperties.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No pending approvals at the moment</p>
                <p className="text-gray-400 text-sm mt-1">All properties have been reviewed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingProperties.map((property) => (
                  <div key={property.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-navy text-lg">{property.title}</h3>
                        <p className="text-gray-600">Landlord: {property.landlord.name}</p>
                        <p className="text-gray-600">Location: {property.location.name}</p>
                        <p className="text-primary-green font-medium mt-1">{formatPrice(property.price)}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{getImageCount(property.images)} media item(s)</span>
                          <span>Submitted: {new Date(property.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/properties/${property.id}`}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Review Details
                        </Link>
                        <button
                          onClick={() => updatePropertyStatus(property.id, "APPROVED")}
                          disabled={updatingId === property.id}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                          Approve
                        </button>
                        <Link
                          href={`/admin/properties/${property.id}`}
                          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                          title="Rejection requires reason on the details page."
                        >
                          Reject (with reason)
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activePanel === "properties" ? (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {(["ALL", "PENDING", "APPROVED", "REJECTED"] as PropertyFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setPropertyFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      propertyFilter === status ? "bg-[#192F59] text-white border-[#192F59]" : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Landlord</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Bookings</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Submitted</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.length === 0 ? (
                      <tr>
                        <td className="py-10 px-4 text-center text-gray-500" colSpan={8}>
                          No properties found for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredProperties.map((property) => (
                        <tr key={property.id} className="border-b border-gray-100">
                          <td className="py-4 px-4 font-medium text-navy">{property.title}</td>
                          <td className="py-4 px-4 text-gray-700">{property.landlord.name}</td>
                          <td className="py-4 px-4 text-gray-700">{property.location.name}</td>
                          <td className="py-4 px-4 text-primary-green font-medium">{formatPrice(property.price)}</td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                property.status === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : property.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {property.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-700">{property._count?.bookings ?? 0}</td>
                          <td className="py-4 px-4 text-gray-700">{new Date(property.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 px-4">
                            <Link href={`/admin/properties/${property.id}`} className="text-[#192F59] hover:text-[#E67E22] font-medium">
                              Review details
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activePanel === "users" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Verification</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Listings</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Bookings</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td className="py-10 px-4 text-center text-gray-500" colSpan={7}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100">
                        <td className="py-4 px-4 font-medium text-navy">{user.name}</td>
                        <td className="py-4 px-4 text-gray-700">{user.email}</td>
                        <td className="py-4 px-4 text-gray-700">{user.role}</td>
                        <td className="py-4 px-4 text-gray-700">{user.verificationStatus}</td>
                        <td className="py-4 px-4 text-gray-700">{user._count?.properties ?? 0}</td>
                        <td className="py-4 px-4 text-gray-700">{user._count?.bookings ?? 0}</td>
                        <td className="py-4 px-4 text-gray-700">{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Landlord</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td className="py-10 px-4 text-center text-gray-500" colSpan={7}>
                        No bookings found.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100">
                        <td className="py-4 px-4 text-gray-700">{booking.student.name}</td>
                        <td className="py-4 px-4 font-medium text-navy">{booking.property.title}</td>
                        <td className="py-4 px-4 text-gray-700">{booking.property.location.name}</td>
                        <td className="py-4 px-4 text-gray-700">{booking.property.landlord.name}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === "CONFIRMED"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-700">{new Date(booking.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <Link href={`/admin/properties/${booking.property.id}`} className="text-[#192F59] hover:text-[#E67E22] font-medium">
                            View listing
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
