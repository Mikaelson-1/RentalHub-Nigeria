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

interface ForecastData {
  monthlyBookings: { month: string; count: number }[];
  bookingStatusBreakdown: { PENDING: number; CONFIRMED: number; CANCELLED: number };
  totalApproved: number;
  totalPending: number;
  forecast: string;
}

interface VerificationLandlord {
  id: string;
  name: string;
  email: string;
  verificationStatus: string;
  aiPreScreenScore: string | null;
  aiPreScreenNote: string | null;
  verificationSubmittedAt: string | null;
  governmentIdUrl: string | null;
  selfieUrl: string | null;
  ownershipProofUrl: string | null;
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

type AdminPanel = "properties" | "pending" | "users" | "bookings" | "verifications" | "forecast";
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
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [verificationLandlords, setVerificationLandlords] = useState<VerificationLandlord[]>([]);
  const [verificationUpdatingId, setVerificationUpdatingId] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState("");

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
        landlordsResponse,
      ] = await Promise.all([
        fetch(`/api/admin/summary?t=${Date.now()}${schoolParam}`, { cache: "no-store" }),
        fetch(`/api/properties?status=PENDING&pageSize=100${propSchoolParam}`, { cache: "no-store" }),
        fetch(`/api/properties?status=APPROVED&pageSize=100${propSchoolParam}`, { cache: "no-store" }),
        fetch(`/api/properties?status=REJECTED&pageSize=100${propSchoolParam}`, { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch(`/api/admin/bookings?t=${Date.now()}${schoolParam}`, { cache: "no-store" }),
        fetch("/api/admin/landlords", { cache: "no-store" }),
      ]);

      const summaryPayload = (await summaryResponse.json()) as AdminSummaryResponse;
      const pendingPayload = (await pendingResponse.json()) as PropertiesResponse;
      const approvedPayload = (await approvedResponse.json()) as PropertiesResponse;
      const rejectedPayload = (await rejectedResponse.json()) as PropertiesResponse;
      const usersPayload = (await usersResponse.json()) as UsersResponse;
      const bookingsPayload = (await bookingsResponse.json()) as BookingsResponse;
      const landlordsPayload = (await landlordsResponse.json()) as { success: boolean; data?: VerificationLandlord[] };

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
      setVerificationLandlords(landlordsPayload.data ?? []);
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

  const updateVerification = async (landlordId: string, action: "APPROVE" | "REJECT" | "SUSPEND" | "UNSUSPEND" | "RESET", note?: string) => {
    setVerificationUpdatingId(landlordId);
    setVerificationError("");
    setVerificationSuccess("");
    try {
      const response = await fetch("/api/admin/landlords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landlordId, action, note }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to update verification.");
      }
      setVerificationSuccess(payload.message ?? "Done.");
      await loadAdminData(selectedSchool);
    } catch (e) {
      setVerificationError(e instanceof Error ? e.message : "Failed to update verification.");
    } finally {
      setVerificationUpdatingId("");
    }
  };

  const loadForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const schoolParam = selectedSchool !== "ALL" ? `?school=${encodeURIComponent(selectedSchool)}` : "";
      const res = await fetch(`/api/admin/demand-forecast${schoolParam}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) setForecast(json.data);
    } catch { /* silent */ }
    finally { setForecastLoading(false); }
  }, [selectedSchool]);

  useEffect(() => {
    if (activePanel === "forecast") loadForecast();
  }, [activePanel, loadForecast]);

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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
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

        <button
          onClick={() => setActivePanel("verifications")}
          className={`bg-white p-6 rounded-xl shadow-sm text-left hover:shadow-md transition-shadow ${activePanel === "verifications" ? "ring-2 ring-purple-400/30" : ""}`}
        >
          <div className="text-3xl font-bold text-purple-600">{verificationLandlords.length}</div>
          <div className="text-gray-600">Pending Verifications</div>
        </button>

        <button
          onClick={() => setActivePanel("forecast")}
          className={`bg-white p-6 rounded-xl shadow-sm text-left hover:shadow-md transition-shadow ${activePanel === "forecast" ? "ring-2 ring-indigo-400/30" : ""}`}
        >
          <div className="text-3xl font-bold text-indigo-600">AI</div>
          <div className="text-gray-600">Demand Forecast</div>
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
              {activePanel === "verifications" && "Landlord Verifications"}
              {activePanel === "forecast" && "AI Demand Forecast"}
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
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td className="py-10 px-4 text-center text-gray-500" colSpan={8}>
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
                        <td className="py-4 px-4">
                          {user.role === "LANDLORD" && (
                            <div className="flex flex-wrap gap-1">
                              {user.verificationStatus === "SUSPENDED" ? (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Unsuspend ${user.name}?`)) return;
                                    await updateVerification(user.id, "UNSUSPEND");
                                  }}
                                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-md font-medium"
                                >Unsuspend</button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Suspend ${user.name}?`)) return;
                                    await updateVerification(user.id, "SUSPEND");
                                  }}
                                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md font-medium"
                                >Suspend</button>
                              )}
                              {user.verificationStatus === "VERIFIED" && (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Reset ${user.name}'s verification? They must re-submit documents.`)) return;
                                    await updateVerification(user.id, "RESET");
                                  }}
                                  className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1 rounded-md font-medium"
                                >Reset</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activePanel === "bookings" ? (
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
          ) : activePanel === "verifications" ? (() => {
              const awaitingReview   = verificationLandlords.filter(l => l.verificationStatus === "UNDER_REVIEW");
              const rejected         = verificationLandlords.filter(l => l.verificationStatus === "REJECTED");
              const suspended        = verificationLandlords.filter(l => l.verificationStatus === "SUSPENDED");
              const notYetSubmitted  = verificationLandlords.filter(l => l.verificationStatus === "UNVERIFIED");
              const verifiedNoDocs   = verificationLandlords.filter(l => l.verificationStatus === "VERIFIED" && !l.governmentIdUrl);

              const LandlordCard = ({ landlord, showApproveReject }: { landlord: VerificationLandlord; showApproveReject: boolean }) => {
                const isUpdating = verificationUpdatingId === landlord.id;
                return (
                  <div className="border border-gray-200 rounded-xl p-5 bg-white">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-navy">{landlord.name}</h3>
                          {landlord.aiPreScreenScore && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              landlord.aiPreScreenScore === "PASS"   ? "bg-green-100 text-green-700" :
                              landlord.aiPreScreenScore === "FAIL"   ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>AI: {landlord.aiPreScreenScore}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{landlord.email}</p>
                        {landlord.aiPreScreenNote && (
                          <p className="text-xs text-gray-400 mt-1 italic">&quot;{landlord.aiPreScreenNote}&quot;</p>
                        )}

                        {/* Document links */}
                        <div className="flex flex-wrap gap-3 mt-3">
                          {landlord.governmentIdUrl ? (
                            <a href={landlord.governmentIdUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                              📄 View Gov ID
                            </a>
                          ) : <span className="text-xs text-gray-400 italic">No Gov ID uploaded</span>}
                          {landlord.selfieUrl ? (
                            <a href={landlord.selfieUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                              🤳 View Selfie
                            </a>
                          ) : <span className="text-xs text-gray-400 italic">No selfie uploaded</span>}
                          {landlord.ownershipProofUrl ? (
                            <a href={landlord.ownershipProofUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                              🏠 View Ownership Proof
                            </a>
                          ) : <span className="text-xs text-gray-400 italic">No ownership proof uploaded</span>}
                        </div>

                        {landlord.verificationSubmittedAt && (
                          <p className="text-xs text-gray-400 mt-2">
                            Submitted: {new Date(landlord.verificationSubmittedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        {/* Approve + Reject — only for landlords who have submitted documents */}
                        {showApproveReject && (
                          <>
                            <button
                              disabled={isUpdating}
                              onClick={() => updateVerification(landlord.id, "APPROVE")}
                              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >{isUpdating ? "Saving…" : "✓ Approve"}</button>
                            <button
                              disabled={isUpdating}
                              onClick={async () => {
                                const note = prompt("Enter rejection reason (will be emailed to the landlord):");
                                if (!note?.trim()) return;
                                await updateVerification(landlord.id, "REJECT", note.trim());
                              }}
                              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >{isUpdating ? "Saving…" : "✕ Reject"}</button>
                          </>
                        )}

                        {/* Suspend / Unsuspend */}
                        {landlord.verificationStatus === "SUSPENDED" ? (
                          <button
                            disabled={isUpdating}
                            onClick={() => updateVerification(landlord.id, "UNSUSPEND")}
                            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >{isUpdating ? "Saving…" : "Unsuspend"}</button>
                        ) : (
                          <button
                            disabled={isUpdating}
                            onClick={async () => {
                              if (!confirm(`Suspend ${landlord.name}? They will lose dashboard access.`)) return;
                              await updateVerification(landlord.id, "SUSPEND");
                            }}
                            className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >{isUpdating ? "Saving…" : "Suspend"}</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-8">
                  {verificationError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{verificationError}</div>
                  )}
                  {verificationSuccess && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{verificationSuccess}</div>
                  )}

                  {verificationLandlords.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">No landlords need attention</p>
                      <p className="text-gray-400 text-sm mt-1">All verification submissions have been reviewed</p>
                    </div>
                  )}

                  {/* ── Section 1: Awaiting your review ── */}
                  {awaitingReview.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <h3 className="font-semibold text-gray-800">Awaiting Your Review ({awaitingReview.length})</h3>
                        <span className="text-xs text-gray-400">— Open the document links, then Approve or Reject</span>
                      </div>
                      <div className="space-y-3">
                        {awaitingReview.map(l => <LandlordCard key={l.id} landlord={l} showApproveReject={true} />)}
                      </div>
                    </div>
                  )}

                  {/* ── Section 2: Previously rejected, may have resubmitted ── */}
                  {rejected.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <h3 className="font-semibold text-gray-800">Previously Rejected ({rejected.length})</h3>
                        <span className="text-xs text-gray-400">— Check if they have resubmitted new documents</span>
                      </div>
                      <div className="space-y-3">
                        {rejected.map(l => <LandlordCard key={l.id} landlord={l} showApproveReject={!!l.governmentIdUrl} />)}
                      </div>
                    </div>
                  )}

                  {/* ── Section 3: Suspended ── */}
                  {suspended.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                        <h3 className="font-semibold text-gray-800">Suspended ({suspended.length})</h3>
                      </div>
                      <div className="space-y-3">
                        {suspended.map(l => <LandlordCard key={l.id} landlord={l} showApproveReject={false} />)}
                      </div>
                    </div>
                  )}

                  {/* ── Section 4: Verified without documents ── */}
                  {verifiedNoDocs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <h3 className="font-semibold text-gray-800">Verified Without Documents ({verifiedNoDocs.length})</h3>
                        <span className="text-xs text-gray-400">— These accounts were marked verified before documents were required</span>
                      </div>
                      <div className="space-y-3">
                        {verifiedNoDocs.map(l => {
                          const isUpdating = verificationUpdatingId === l.id;
                          return (
                            <div key={l.id} className="border border-amber-200 rounded-xl p-5 bg-amber-50">
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                  <p className="font-semibold text-gray-800">{l.name}</p>
                                  <p className="text-sm text-gray-500">{l.email}</p>
                                </div>
                                <button
                                  disabled={isUpdating}
                                  onClick={async () => {
                                    if (!confirm(`Reset ${l.name}'s verification? They must re-submit documents before being re-approved.`)) return;
                                    await updateVerification(l.id, "RESET");
                                  }}
                                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >{isUpdating ? "Saving…" : "Reset & Require Documents"}</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Section 5: Not yet submitted ── */}
                  {notYetSubmitted.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <h3 className="font-semibold text-gray-800">Not Yet Submitted ({notYetSubmitted.length})</h3>
                        <span className="text-xs text-gray-400">— Waiting for landlord to complete the verification form</span>
                      </div>
                      <div className="space-y-3">
                        {notYetSubmitted.map(l => {
                          const isUpdating = verificationUpdatingId === l.id;
                          return (
                            <div key={l.id} className="border border-gray-200 rounded-xl p-4 bg-white flex items-center justify-between flex-wrap gap-3">
                              <div>
                                <p className="font-semibold text-gray-800">{l.name}</p>
                                <p className="text-sm text-gray-500">{l.email}</p>
                                <p className="text-xs text-yellow-600 mt-1">No documents submitted yet — no action required until they apply</p>
                              </div>
                              <button
                                disabled={isUpdating}
                                onClick={async () => {
                                  if (!confirm(`Suspend ${l.name}?`)) return;
                                  await updateVerification(l.id, "SUSPEND");
                                }}
                                className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >{isUpdating ? "Saving…" : "Suspend"}</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : activePanel === "forecast" ? (
            <div>
              {forecastLoading ? (
                <div className="text-center py-10 text-gray-500">Generating AI forecast...</div>
              ) : !forecast ? (
                <div className="text-center py-10 text-gray-500">Click the Demand Forecast card to load.</div>
              ) : (
                <div className="space-y-6">
                  {/* AI Insight */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">&#x1F916;</span>
                      <h3 className="font-semibold text-indigo-900">AI Demand Forecast</h3>
                    </div>
                    <p className="text-sm text-indigo-800 leading-relaxed">{forecast.forecast}</p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{forecast.totalApproved}</p>
                      <p className="text-xs text-gray-500 mt-1">Live Listings</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{forecast.totalPending}</p>
                      <p className="text-xs text-gray-500 mt-1">Pending Review</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{forecast.bookingStatusBreakdown.CONFIRMED}</p>
                      <p className="text-xs text-gray-500 mt-1">Confirmed Bookings</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-600">{forecast.bookingStatusBreakdown.PENDING}</p>
                      <p className="text-xs text-gray-500 mt-1">Pending Bookings</p>
                    </div>
                  </div>

                  {/* Monthly bookings bar chart */}
                  {forecast.monthlyBookings.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-800 mb-4 text-sm">Monthly Booking Activity (Last 12 Months)</h4>
                      <div className="flex items-end gap-2 h-32">
                        {forecast.monthlyBookings.map((m) => {
                          const maxCount = Math.max(...forecast.monthlyBookings.map((x) => x.count), 1);
                          const pct = (m.count / maxCount) * 100;
                          return (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-xs text-gray-600 font-medium">{m.count}</span>
                              <div
                                className="w-full bg-indigo-500 rounded-t-sm transition-all"
                                style={{ height: `${Math.max(pct, 4)}%` }}
                              />
                              <span className="text-[10px] text-gray-400 rotate-45 origin-left translate-y-3">{m.month.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">Select a panel above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
