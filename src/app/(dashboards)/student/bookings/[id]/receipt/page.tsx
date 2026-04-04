"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

interface ReceiptBooking {
  id: string;
  status: string;
  paidAt: string | null;
  amount: number | null;
  agencyFee: number | null;
  cautionFee: number | null;
  moveInDate: string | null;
  leaseEndDate: string | null;
  property: {
    id: string;
    title: string;
    location: { name: string };
    landlord: { name: string; email: string; phoneNumber: string | null };
  };
  student: {
    name: string;
    email: string;
  };
  payments: {
    paystackRef: string;
    amount: number;
    channel: string | null;
    paidAt: string | null;
  }[];
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<ReceiptBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/bookings/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Booking not found.");
        setBooking(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load receipt.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const formatPrice = (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(v));

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "—";

  if (isLoading) return <div className="text-center py-16 text-gray-500">Loading receipt...</div>;
  if (error || !booking) return (
    <div className="text-center py-16">
      <p className="text-red-500 mb-4">{error || "Receipt not available."}</p>
      <Link href="/student?tab=bookings" className="text-[#192F59] hover:underline">← Back to bookings</Link>
    </div>
  );

  const totalPaid = Number(booking.amount ?? 0) + Number(booking.agencyFee ?? 0) + Number(booking.cautionFee ?? 0);
  const primaryRef = booking.payments[0]?.paystackRef ?? "—";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Screen actions — hidden on print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/student?tab=bookings" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Bookings
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#192F59] hover:bg-[#14264a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" /> Print Receipt
        </button>
      </div>

      {/* Receipt card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="receipt">
        {/* Header */}
        <div className="bg-[#192F59] text-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">RentalHub NG</h1>
              <p className="text-blue-200 text-sm mt-0.5">Student Housing Platform</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs uppercase tracking-wide">Receipt</p>
              <p className="text-white font-mono text-sm mt-0.5">{primaryRef}</p>
            </div>
          </div>
        </div>

        {/* Status banner */}
        <div className="bg-green-50 border-b border-green-200 px-8 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-800 text-sm font-medium">Payment Confirmed</span>
          <span className="ml-auto text-green-600 text-xs">{formatDate(booking.paidAt)}</span>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Property + parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Tenant</p>
              <p className="font-semibold text-navy">{booking.student.name}</p>
              <p className="text-sm text-gray-500">{booking.student.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Landlord</p>
              <p className="font-semibold text-navy">{booking.property.landlord.name}</p>
              <p className="text-sm text-gray-500">{booking.property.landlord.email}</p>
              {booking.property.landlord.phoneNumber && (
                <p className="text-sm text-gray-500">{booking.property.landlord.phoneNumber}</p>
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Property details */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Property</p>
            <p className="font-semibold text-navy text-lg">{booking.property.title}</p>
            <p className="text-sm text-gray-500">{booking.property.location.name}</p>
          </div>

          {/* Tenancy dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Move-in Date</p>
              <p className="text-sm font-medium text-gray-700">{formatDate(booking.moveInDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Lease End Date</p>
              <p className="text-sm font-medium text-gray-700">{formatDate(booking.leaseEndDate)}</p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Payment breakdown */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Payment Breakdown</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Annual Rent</span>
                <span className="font-medium">{formatPrice(booking.amount)}</span>
              </div>
              {booking.agencyFee ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Agency Fee</span>
                  <span className="font-medium">{formatPrice(booking.agencyFee)}</span>
                </div>
              ) : null}
              {booking.cautionFee ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Caution Fee</span>
                  <span className="font-medium">{formatPrice(booking.cautionFee)}</span>
                </div>
              ) : null}
              <hr className="border-dashed border-gray-200" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-navy">Total Paid</span>
                <span className="text-green-700">{formatPrice(totalPaid)}</span>
              </div>
            </div>
          </div>

          {/* Payment method */}
          {booking.payments.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Payment Details</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-500 text-xs">Reference</p>
                  <p className="font-mono text-gray-700 text-xs mt-0.5">{primaryRef}</p>
                </div>
                {booking.payments[0]?.channel && (
                  <div>
                    <p className="text-gray-500 text-xs">Method</p>
                    <p className="text-gray-700 capitalize text-xs mt-0.5">{booking.payments[0].channel}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-2">
            <p>This is an official payment receipt from RentalHub NG.</p>
            <p className="mt-0.5">Booking ID: {booking.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
