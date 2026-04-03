"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface PropertyItem {
  id: string;
  title: string;
  price: number | string;
  location: {
    name: string;
  };
}

interface BookingItem {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
  property: {
    id: string;
    title: string;
    price: number | string;
    location: {
      name: string;
    };
  };
}

interface PropertiesResponse {
  success: boolean;
  data?: {
    items: PropertyItem[];
  };
  error?: string;
}

interface BookingsResponse {
  success: boolean;
  data?: {
    items: BookingItem[];
    total: number;
    totalPages: number;
  };
  error?: string;
}

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<"browse" | "bookings">("browse");
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingPropertyId, setBookingPropertyId] = useState("");
  const [error, setError] = useState("");

  const loadStudentData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [propertiesResponse, bookingsResponse] = await Promise.all([
        fetch("/api/properties?pageSize=24", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
      ]);

      const propertiesPayload = (await propertiesResponse.json()) as PropertiesResponse;
      const bookingsPayload = (await bookingsResponse.json()) as BookingsResponse;

      if (!propertiesResponse.ok || !propertiesPayload.success) {
        throw new Error(propertiesPayload.error || "Failed to load properties.");
      }

      if (!bookingsResponse.ok || !bookingsPayload.success) {
        throw new Error(bookingsPayload.error || "Failed to load bookings.");
      }

      setProperties(propertiesPayload.data?.items ?? []);
      setBookings(bookingsPayload.data?.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load student dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  const bookProperty = async (propertyId: string) => {
    setBookingPropertyId(propertyId);
    setError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to create booking.");
      }

      await loadStudentData();
      setActiveTab("bookings");
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : "Failed to create booking.");
    } finally {
      setBookingPropertyId("");
    }
  };

  const hasActiveBooking = (propertyId: string) =>
    bookings.some(
      (booking) =>
        booking.property.id === propertyId &&
        (booking.status === "PENDING" || booking.status === "CONFIRMED"),
    );

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(price));

  const confirmedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "CONFIRMED").length,
    [bookings],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "PENDING").length,
    [bookings],
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Student Dashboard</h1>
        <p className="text-gray-600 mt-1">Browse properties and manage your bookings</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">{bookings.length}</div>
          <div className="text-gray-600">Total Bookings</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">{confirmedBookings}</div>
          <div className="text-gray-600">Confirmed</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">{pendingBookings}</div>
          <div className="text-gray-600">Pending</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("browse")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "browse"
                  ? "border-primary-green text-primary-green"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Browse Properties
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "bookings"
                  ? "border-primary-green text-primary-green"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Bookings
            </button>
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading dashboard...</div>
          ) : activeTab === "browse" ? (
            properties.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No properties available yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => {
                  const booked = hasActiveBooking(property.id);
                  return (
                    <div
                      key={property.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="h-40 bg-gray-100" />
                      <div className="p-4">
                        <h3 className="font-semibold text-navy text-lg">{property.title}</h3>
                        <p className="text-gray-600 text-sm">{property.location.name}</p>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-primary-green font-bold">{formatPrice(property.price)}</span>
                        </div>
                        <button
                          onClick={() => bookProperty(property.id)}
                          disabled={booked || bookingPropertyId === property.id}
                          className="w-full mt-4 bg-primary-green hover:bg-primary-dark disabled:bg-gray-300 text-white py-2 rounded-lg transition-colors"
                        >
                          {bookingPropertyId === property.id
                            ? "Booking..."
                            : booked
                            ? "Already Booked"
                            : "Book Now"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No bookings yet</p>
              <Link href="/properties" className="text-primary-green hover:underline mt-2 inline-block">
                Browse properties
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold text-navy">{booking.property.title}</h3>
                    <p className="text-gray-600 text-sm">
                      {booking.property.location.name} • {formatPrice(booking.property.price)}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Booked on {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        booking.status === "CONFIRMED"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {booking.status}
                    </span>
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
