"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Wifi, Zap, Shield, Droplets, Car, Sun, CheckCircle, Home, Phone, Calendar, FileText, Clock } from "lucide-react";
import { getPropertyImage } from "@/lib/property-image";

type BookingStatus = "PENDING" | "CONFIRMED" | "AWAITING_PAYMENT" | "PAID" | "CANCELLED" | "EXPIRED";
type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface PropertyDetail {
  id: string;
  title: string;
  description: string;
  price: number | string;
  distanceToCampus: number | null;
  amenities: string[];
  location: { name: string };
  landlord: { id: string; name: string; phoneNumber?: string | null };
}

interface BookingItem {
  id: string;
  status: BookingStatus;
  bidAmount: number | null;
  paymentStatus: PaymentStatus | null;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  amount: number | null;
  agencyFee: number | null;
  cautionFee: number | null;
  moveInDate: string | null;
  leaseEndDate: string | null;
  movedInConfirmedAt: string | null;
  payoutStatus: PayoutStatus;
  agreementSignedAt: string | null;
  agreementSignedName: string | null;
  property: PropertyDetail;
}

interface BrowseProperty {
  id: string;
  title: string;
  price: number | string;
  location: { name: string };
}

function AmenityIcon({ name }: { name: string }) {
  const l = name.toLowerCase();
  if (l.includes("wifi") || l.includes("internet")) return <Wifi className="w-3 h-3" />;
  if (l.includes("solar")) return <Sun className="w-3 h-3" />;
  if (l.includes("generator") || l.includes("prepaid")) return <Zap className="w-3 h-3" />;
  if (l.includes("security") || l.includes("burglar")) return <Shield className="w-3 h-3" />;
  if (l.includes("water") || l.includes("borehole")) return <Droplets className="w-3 h-3" />;
  if (l.includes("parking") || l.includes("car")) return <Car className="w-3 h-3" />;
  return <CheckCircle className="w-3 h-3" />;
}

function PaymentTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${hours}h ${minutes}m remaining`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return (
    <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
      <Clock className="w-3 h-3" /> {timeLeft}
    </span>
  );
}

function ApartmentManagementCard({ booking, onRefresh }: { booking: BookingItem; onRefresh: () => void }) {
  const formatPrice = (v: number | string | null) =>
    v === null || v === undefined ? "—" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(v));
  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "Not set";

  // Move-in date: default to existing date or today
  const todayStr = new Date().toISOString().split("T")[0];
  const [moveInDateInput, setMoveInDateInput] = useState(
    booking.moveInDate ? new Date(booking.moveInDate).toISOString().split("T")[0] : todayStr
  );
  const [confirmingMoveIn, setConfirmingMoveIn] = useState(false);
  const [moveInError, setMoveInError] = useState("");
  const [moveInSuccess, setMoveInSuccess] = useState(false);

  const alreadyMovedIn = !!booking.movedInConfirmedAt;

  const handleConfirmMoveIn = async () => {
    setConfirmingMoveIn(true);
    setMoveInError("");
    try {
      const res = await fetch("/api/bookings/moved-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, moveInDate: moveInDateInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to confirm move-in.");
      setMoveInSuccess(true);
      onRefresh();
    } catch (err) {
      setMoveInError(err instanceof Error ? err.message : "Failed to confirm move-in.");
    } finally {
      setConfirmingMoveIn(false);
    }
  };

  const payoutLabel: Record<PayoutStatus, { text: string; className: string }> = {
    PENDING:    { text: "Payment release pending — RentalHub will transfer to your landlord", className: "text-amber-600 font-medium" },
    PROCESSING: { text: "Payout in progress…", className: "text-blue-600 font-medium" },
    COMPLETED:  { text: "Landlord paid ✓", className: "text-green-600 font-semibold" },
    FAILED:     { text: "Payout issue — RentalHub support will contact you", className: "text-red-600 font-medium" },
  };

  return (
    <div className="mt-4 border border-green-200 bg-green-50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Home className="w-5 h-5 text-green-700" />
        <h4 className="font-bold text-green-900 text-sm">Your Apartment</h4>
        <span className="ml-auto bg-green-500 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold">PAID</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {/* Payment summary */}
        <div className="bg-white rounded-lg p-3 border border-green-100">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Payment</p>
          <p className="text-gray-700">Rent: <span className="font-semibold">{formatPrice(booking.amount)}</span></p>
          {booking.agencyFee ? <p className="text-gray-700">Agency: <span className="font-semibold">{formatPrice(booking.agencyFee)}</span></p> : null}
          {booking.cautionFee ? <p className="text-gray-700">Caution: <span className="font-semibold">{formatPrice(booking.cautionFee)}</span></p> : null}
          <p className="text-xs text-gray-400 mt-2">Paid on {formatDate(booking.paidAt)}</p>
        </div>

        {/* Lease info */}
        <div className="bg-white rounded-lg p-3 border border-green-100">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Tenancy</p>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-700 text-xs">Move-in: <span className="font-semibold">{formatDate(booking.moveInDate)}</span></p>
              <p className="text-gray-700 text-xs mt-0.5">Lease ends: <span className="font-semibold">{formatDate(booking.leaseEndDate)}</span></p>
            </div>
          </div>
        </div>

        {/* Landlord contact */}
        <div className="bg-white rounded-lg p-3 border border-green-100">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Landlord Contact</p>
          <p className="text-gray-700 font-medium">{booking.property.landlord.name}</p>
          {booking.property.landlord.phoneNumber && (
            <a href={`tel:${booking.property.landlord.phoneNumber}`} className="flex items-center gap-1.5 text-[#192F59] hover:text-[#E67E22] text-sm mt-1 transition-colors">
              <Phone className="w-3.5 h-3.5" /> {booking.property.landlord.phoneNumber}
            </a>
          )}
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-lg p-3 border border-green-100 flex flex-col justify-between">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Documents</p>
          <Link href={`/student/bookings/${booking.id}/receipt`} className="flex items-center gap-2 text-sm text-[#192F59] hover:text-[#E67E22] font-medium transition-colors">
            <FileText className="w-4 h-4" /> View Payment Receipt
          </Link>
        </div>
      </div>

      {/* ── Move-in confirmation ── */}
      <div className="mt-4 border-t border-green-200 pt-4">
        {alreadyMovedIn || moveInSuccess ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              Moved in on {formatDate(booking.movedInConfirmedAt ?? new Date().toISOString())}
            </div>
            <p className={`text-xs ${payoutLabel[booking.payoutStatus ?? "PROCESSING"].className}`}>
              {payoutLabel[booking.payoutStatus ?? "PROCESSING"].text}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">When are you moving in?</p>
              <input
                type="date"
                value={moveInDateInput}
                min={todayStr}
                onChange={(e) => setMoveInDateInput(e.target.value)}
                className="w-full sm:w-56 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/30"
              />
            </div>
            {moveInError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{moveInError}</p>
            )}
            <button
              onClick={handleConfirmMoveIn}
              disabled={confirmingMoveIn || !moveInDateInput}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {confirmingMoveIn ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {confirmingMoveIn ? "Confirming…" : "I've Moved In"}
            </button>
            <p className="text-xs text-gray-400">
              Clicking this releases payment to your landlord. Only confirm once you have physically moved in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tenancy Agreement Modal ────────────────────────────────────────────────

const TENANCY_RULES = `
TENANCY AGREEMENT — RENTALHUB

This Tenancy Agreement ("Agreement") is entered into between the Landlord (the owner of the property listed on RentalHub) and the Tenant (the student signing below), facilitated by RentalHub.

1. TERM & RENT
   a. The tenancy commences on the agreed move-in date and runs for the lease period specified at booking.
   b. The full rent, agency fee (if applicable), and caution fee (if applicable) must be paid via RentalHub before move-in.
   c. Rent is non-refundable once the Tenant has moved in, except in cases of gross misrepresentation by the Landlord.

2. PERMITTED USE
   a. The property is for residential use by the Tenant only.
   b. The Tenant shall not use the property for any commercial, illegal, or immoral purposes.
   c. The Tenant shall not use the property to host gambling, drug use, or any activity prohibited by applicable law.

3. NO SUBLETTING
   a. The Tenant shall not sublet, assign, or transfer the tenancy or any part of the property to any other person without prior written consent from the Landlord.
   b. Unauthorized subletting is grounds for immediate termination of tenancy.

4. OCCUPANCY
   a. Only the named Tenant is authorised to occupy the property.
   b. Overnight guests must not exceed 3 consecutive nights without the Landlord's written approval.
   c. The maximum number of visitors at any time must comply with the Landlord's house rules.

5. NOISE & CONDUCT
   a. The Tenant shall maintain reasonable quiet hours — no loud music, parties, or disturbances between 10:00 PM and 7:00 AM.
   b. The Tenant shall be respectful of neighbours and other tenants in shared compounds.
   c. Repeated noise complaints are grounds for termination of tenancy without refund.

6. PROPERTY MAINTENANCE
   a. The Tenant shall keep the property clean, tidy, and in good condition throughout the tenancy.
   b. The Tenant shall promptly report any damage, leaks, electrical faults, or structural issues to the Landlord.
   c. The Tenant shall not make any alterations, renovations, or structural changes to the property without written consent from the Landlord.
   d. Nails, screws, and fixtures may not be drilled into walls without permission.

7. DAMAGE & LIABILITY
   a. The Tenant is responsible for any damage to the property beyond normal wear and tear.
   b. The cost of repairs for tenant-caused damage shall be deducted from the caution fee or billed to the Tenant directly.
   c. The Landlord is not liable for loss or damage to the Tenant's personal belongings.

8. UTILITIES & BILLS
   a. Electricity, water, internet, and waste disposal charges (where not included in rent) are the sole responsibility of the Tenant.
   b. The Tenant shall not tamper with or bypass utility meters.
   c. Unpaid utility bills at the end of tenancy shall be deducted from the caution fee.

9. WASTE DISPOSAL & HYGIENE
   a. The Tenant shall dispose of waste only in designated bins and at scheduled times.
   b. Burning of refuse within or around the property is strictly prohibited.
   c. The Tenant shall keep shared facilities (kitchens, bathrooms, corridors) clean at all times.

10. NO SMOKING
    a. Smoking of cigarettes, shisha, or any substance is strictly prohibited inside the property and within 5 metres of entrances.

11. PETS
    a. No pets or animals of any kind are allowed on the property without prior written consent from the Landlord.

12. SECURITY
    a. The Tenant shall ensure all doors and windows are securely locked when leaving the property.
    b. The Tenant shall not duplicate or share keys/access codes without the Landlord's written permission.
    c. The Tenant shall not tamper with locks, security cameras, or access control systems.

13. NOTICE TO VACATE
    a. The Tenant must provide at least one (1) month's written notice before vacating the property.
    b. Failure to provide adequate notice may result in forfeiture of part or all of the caution fee.

14. MOVE-OUT CONDITION
    a. On vacating, the Tenant shall return the property in the same condition it was received (fair wear and tear excepted).
    b. The Landlord will conduct an inspection within 7 days of move-out to assess the condition.
    c. The caution fee (less any deductions) shall be refunded within 14 days of a satisfactory inspection.

15. TERMINATION
    a. The Landlord may terminate this Agreement immediately if the Tenant breaches any term of this Agreement.
    b. Grounds for immediate termination include: illegal activity, subletting, serious damage to property, non-payment, or repeated disturbance of neighbours.

16. DISPUTE RESOLUTION
    a. Any disputes arising from this tenancy shall first be attempted to be resolved amicably between both parties.
    b. RentalHub may be engaged as a neutral mediator.
    c. If unresolved, disputes shall be governed by applicable local laws.

17. ACKNOWLEDGEMENT
    By signing this Agreement, the Tenant confirms they have read, understood, and agreed to all the above terms and conditions. The Tenant also confirms that the information provided during registration is accurate and truthful.

RentalHub acts solely as a facilitating platform and is not a party to this tenancy agreement.
`.trim();

function TenancyAgreementModal({
  booking,
  onClose,
  onSigned,
}: {
  booking: BookingItem;
  onClose: () => void;
  onSigned: () => void;
}) {
  const [signedName, setSignedName] = useState("");
  const [hasRead, setHasRead] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

  const handleSign = async () => {
    if (!hasRead) { setError("Please confirm you have read the agreement."); return; }
    if (signedName.trim().split(/\s+/).length < 2) { setError("Please enter your full name (first and last name)."); return; }
    setSigning(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/sign-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, signedName: signedName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record signature.");
      onSigned();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign agreement.");
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#192F59]">Tenancy Agreement</h2>
            <p className="text-xs text-gray-500 mt-0.5">{booking.property.title} · {booking.property.location.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            ✕
          </button>
        </div>

        {/* Scrollable agreement body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <pre className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed font-sans">{TENANCY_RULES}</pre>
        </div>

        {/* Signature section */}
        <div className="border-t border-gray-200 px-6 py-5 flex-shrink-0 space-y-4 bg-gray-50 rounded-b-2xl">
          {/* Read confirmation */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasRead}
              onChange={(e) => { setHasRead(e.target.checked); setError(""); }}
              className="mt-0.5 w-4 h-4 accent-[#192F59] cursor-pointer"
            />
            <span className="text-sm text-gray-700">
              I have read and fully understood this Tenancy Agreement and agree to abide by all the rules and conditions stated above.
            </span>
          </label>

          {/* Signature inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Full Name (Signature)
              </label>
              <input
                type="text"
                placeholder="Type your full name to sign"
                value={signedName}
                onChange={(e) => { setSignedName(e.target.value); setError(""); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Date
              </label>
              <div className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm text-gray-600">
                {today}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSign}
            disabled={signing || !hasRead || !signedName.trim()}
            className="w-full bg-[#192F59] hover:bg-[#14264a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {signing ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing…</>
            ) : (
              "Sign & Agree to Tenancy Terms"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function StudentDashboardInner() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "bookings" ? "bookings" : "browse";

  const [activeTab, setActiveTab] = useState<"browse" | "bookings">(defaultTab);
  const [properties, setProperties] = useState<BrowseProperty[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingPropertyId, setBookingPropertyId] = useState("");
  const [updatingBookingId, setUpdatingBookingId] = useState("");
  const [payingBookingId, setPayingBookingId] = useState("");
  const [signingBookingId, setSigningBookingId] = useState<string | null>(null);
  const [bidDrafts, setBidDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const loadStudentData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [propertiesResponse, bookingsResponse] = await Promise.all([
        fetch("/api/properties?pageSize=24", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
      ]);

      const propertiesPayload = await propertiesResponse.json();
      const bookingsPayload = await bookingsResponse.json();

      if (!propertiesResponse.ok || !propertiesPayload.success) {
        throw new Error(propertiesPayload.error || "Failed to load properties.");
      }
      if (!bookingsResponse.ok || !bookingsPayload.success) {
        throw new Error(bookingsPayload.error || "Failed to load bookings.");
      }

      setProperties(propertiesPayload.data?.items ?? []);
      setBookings(Array.isArray(bookingsPayload.data) ? bookingsPayload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  const bookProperty = async (propertyId: string, fallbackPrice: number | string) => {
    setBookingPropertyId(propertyId);
    setError("");
    try {
      const bidValue = bidDrafts[propertyId] === undefined || bidDrafts[propertyId] === ""
        ? Number(fallbackPrice)
        : Number(bidDrafts[propertyId]);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, bidAmount: bidValue }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Failed to create booking.");
      await loadStudentData();
      setActiveTab("bookings");
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : "Failed to create booking.");
    } finally {
      setBookingPropertyId("");
    }
  };

  const cancelBooking = async (bookingId: string) => {
    setUpdatingBookingId(bookingId);
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status: "CANCELLED" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Failed to cancel booking.");
      await loadStudentData();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Failed to cancel booking.");
    } finally {
      setUpdatingBookingId("");
    }
  };

  const initiatePayment = async (bookingId: string) => {
    setPayingBookingId(bookingId);
    setError("");
    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Failed to initiate payment.");
      // Redirect to Paystack checkout
      window.location.href = payload.data.authorizationUrl;
    } catch (payErr) {
      setError(payErr instanceof Error ? payErr.message : "Failed to initiate payment.");
      setPayingBookingId("");
    }
  };

  const hasActiveBooking = (propertyId: string) =>
    bookings.some((b) => b.property.id === propertyId && ["PENDING", "CONFIRMED", "AWAITING_PAYMENT", "PAID"].includes(b.status));

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(price));

  const confirmedBookings = useMemo(() => bookings.filter((b) => b.status === "CONFIRMED" || b.status === "AWAITING_PAYMENT").length, [bookings]);
  const pendingBookings = useMemo(() => bookings.filter((b) => b.status === "PENDING").length, [bookings]);
  const paidBookings = useMemo(() => bookings.filter((b) => b.status === "PAID").length, [bookings]);

  const statusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case "CONFIRMED": return "bg-blue-500 text-white";
      case "AWAITING_PAYMENT": return "bg-orange-500 text-white";
      case "PAID": return "bg-green-500 text-white";
      case "PENDING": return "bg-amber-400 text-gray-900";
      case "EXPIRED": return "bg-gray-400 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy">Student Dashboard</h1>
          <p className="text-gray-600 mt-1">Browse properties and manage your bookings</p>
        </div>
        <Link
          href="/student/profile"
          className="border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          My Profile
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">{bookings.length}</div>
          <div className="text-gray-600">Total Bookings</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-green-600">{paidBookings}</div>
          <div className="text-gray-600">Paid</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{confirmedBookings}</div>
          <div className="text-gray-600">Confirmed</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-yellow-500">{pendingBookings}</div>
          <div className="text-gray-600">Pending</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("browse")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "browse" ? "border-primary-green text-primary-green" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Browse Properties
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === "bookings" ? "border-primary-green text-primary-green" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Bookings {bookings.length > 0 && <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{bookings.length}</span>}
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
                    <div key={property.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative h-40 bg-gray-100">
                        <Image src={getPropertyImage(property.id)} alt={property.title} fill className="object-cover" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-navy">{property.title}</h3>
                        <p className="text-gray-500 text-sm flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {property.location.name}
                        </p>
                        <p className="text-primary-green font-bold mt-2">{formatPrice(property.price)}<span className="text-xs text-gray-400 font-normal">/yr</span></p>
                        <div className="mt-3">
                          <label className="text-[11px] text-gray-500 block mb-1">Your bid (naira)</label>
                          <input
                            type="number"
                            min="1"
                            value={bidDrafts[property.id] ?? ""}
                            onChange={(event) =>
                              setBidDrafts((prev) => ({ ...prev, [property.id]: event.target.value }))
                            }
                            placeholder={`${Number(property.price)}`}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E67E22]/20 focus:border-[#E67E22]"
                          />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Link href={`/properties/${property.id}`} className="flex-1 text-center text-sm border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            View
                          </Link>
                          <button
                            onClick={() => bookProperty(property.id, property.price)}
                            disabled={booked || bookingPropertyId === property.id}
                            className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-semibold py-2 rounded-lg transition-colors text-sm"
                          >
                            {bookingPropertyId === property.id ? "..." : booked ? "Booked ✓" : "Book"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No bookings yet</p>
              <button onClick={() => setActiveTab("browse")} className="text-primary-green hover:underline mt-2 inline-block text-sm">
                Browse properties →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                  {/* Property image */}
                  <div className="relative h-52 bg-gray-100">
                    <Image
                      src={getPropertyImage(booking.property.id)}
                      alt={booking.property.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(booking.status)}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Location + title */}
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3" /> {booking.property.location.name}
                    </p>
                    <h3 className="text-xl font-bold text-[#192F59]">{booking.property.title}</h3>

                    {/* Price + distance */}
                    <div className="flex items-baseline gap-3 mt-2">
                      <p className="text-2xl font-bold text-[#00A553]">
                        {formatPrice(booking.property.price)}
                        <span className="text-sm font-normal text-gray-400 ml-1">/year</span>
                      </p>
                      {booking.property.distanceToCampus && (
                        <span className="text-xs text-gray-400">{Number(booking.property.distanceToCampus)} km to campus</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      Your bid: <span className="font-semibold text-[#00A553]">{formatPrice(booking.bidAmount ?? booking.property.price)}</span>
                    </p>

                    {/* Description */}
                    {booking.property.description && (
                      <p className="text-sm text-gray-600 mt-3 leading-relaxed line-clamp-3">
                        {booking.property.description}
                      </p>
                    )}

                    {/* Amenities */}
                    {booking.property.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {booking.property.amenities.map((a) => (
                          <span key={a} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                            <AmenityIcon name={a} /> {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Landlord + booked date */}
                    <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                      <span>Listed by <span className="font-medium text-gray-600">{booking.property.landlord.name}</span></span>
                      <span>Booked {new Date(booking.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>

                    {/* AWAITING_PAYMENT — payment CTA */}
                    {booking.status === "AWAITING_PAYMENT" && (
                      <div className="mt-5 border border-orange-200 bg-orange-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-orange-800">Payment Required</p>
                          {booking.expiresAt && <PaymentTimer expiresAt={booking.expiresAt} />}
                        </div>
                        <p className="text-xs text-orange-700 mb-3">
                          The landlord has confirmed your booking. Complete payment within 48 hours to secure your apartment.
                        </p>
                        <div className="flex items-center justify-between text-sm mb-4">
                          <span className="text-gray-600">Total Amount:</span>
                          <span className="font-bold text-orange-900 text-base">
                            {formatPrice((Number(booking.amount ?? booking.property.price) + Number(booking.agencyFee ?? 0) + Number(booking.cautionFee ?? 0)))}
                          </span>
                        </div>

                        {/* Step 1 — Sign agreement */}
                        {!booking.agreementSignedAt ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2.5 text-xs text-orange-800">
                              <span className="mt-0.5 flex-shrink-0">📋</span>
                              <span>Before making payment, you must read and sign the <strong>Tenancy Agreement</strong>. This sets out the rules you agree to follow as a tenant.</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => setSigningBookingId(booking.id)}
                                className="flex-1 bg-[#E67E22] hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                              >
                                📋 Review &amp; Sign Tenancy Agreement
                              </button>
                              <button
                                onClick={() => cancelBooking(booking.id)}
                                disabled={updatingBookingId === booking.id}
                                className="sm:w-auto text-sm text-red-500 hover:text-red-600 disabled:opacity-50 border border-red-200 px-5 py-3 rounded-xl hover:bg-red-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Step 2 — Pay after signing */
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              Agreement signed by <strong className="ml-0.5">{booking.agreementSignedName}</strong> on {new Date(booking.agreementSignedAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => initiatePayment(booking.id)}
                                disabled={payingBookingId === booking.id}
                                className="flex-1 bg-[#192F59] hover:bg-[#14264a] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                              >
                                {payingBookingId === booking.id ? "Redirecting to Paystack..." : "Pay Now via Paystack"}
                              </button>
                              <button
                                onClick={() => cancelBooking(booking.id)}
                                disabled={updatingBookingId === booking.id}
                                className="sm:w-auto text-sm text-red-500 hover:text-red-600 disabled:opacity-50 border border-red-200 px-5 py-3 rounded-xl hover:bg-red-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PAID — apartment management */}
                    {booking.status === "PAID" && (
                      <ApartmentManagementCard booking={booking} onRefresh={loadStudentData} />
                    )}

                    {/* PENDING / CONFIRMED — informational actions */}
                    {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                      <div className="mt-5 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
                          {booking.status === "PENDING"
                            ? "Waiting for the landlord to confirm your request."
                            : "Landlord confirmed! Awaiting payment instructions."}
                        </div>
                        <button
                          onClick={() => cancelBooking(booking.id)}
                          disabled={updatingBookingId === booking.id}
                          className="sm:w-auto text-sm text-red-500 hover:text-red-600 disabled:opacity-50 border border-red-200 px-5 py-3 rounded-xl hover:bg-red-50 transition-colors"
                        >
                          {updatingBookingId === booking.id ? "Cancelling..." : "Cancel"}
                        </button>
                      </div>
                    )}

                    {booking.status === "CANCELLED" && (
                      <p className="mt-4 text-sm text-gray-400 text-center">This booking was cancelled.</p>
                    )}
                    {booking.status === "EXPIRED" && (
                      <p className="mt-4 text-sm text-orange-500 text-center">Payment window expired. Please book again.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tenancy Agreement Modal — rendered as fixed overlay, position in DOM doesn't matter */}
      {signingBookingId && (() => {
        const signingBooking = bookings.find((b) => b.id === signingBookingId);
        return signingBooking ? (
          <TenancyAgreementModal
            booking={signingBooking}
            onClose={() => setSigningBookingId(null)}
            onSigned={() => { setSigningBookingId(null); loadStudentData(); }}
          />
        ) : null;
      })()}
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading dashboard...</div>}>
      <StudentDashboardInner />
    </Suspense>
  );
}
