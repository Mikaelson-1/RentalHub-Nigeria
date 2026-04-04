"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  User, Mail, Phone, ShieldCheck, ShieldAlert, Clock, ShieldX,
  Edit2, Save, X, ChevronLeft, Calendar, Home, CheckCircle,
} from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  verificationStatus: string;
  createdAt: string;
  governmentIdUrl: string | null;
  selfieUrl: string | null;
  ownershipProofUrl: string | null;
  verificationSubmittedAt: string | null;
  verificationNote: string | null;
  _count: { properties: number; bookings: number };
}

function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    VERIFIED: {
      label: "Verified",
      icon: <ShieldCheck className="w-4 h-4" />,
      className: "bg-green-100 text-green-700",
    },
    UNDER_REVIEW: {
      label: "Under Review",
      icon: <Clock className="w-4 h-4" />,
      className: "bg-blue-100 text-blue-700",
    },
    UNVERIFIED: {
      label: "Not Verified",
      icon: <ShieldAlert className="w-4 h-4" />,
      className: "bg-amber-100 text-amber-700",
    },
    REJECTED: {
      label: "Rejected",
      icon: <ShieldX className="w-4 h-4" />,
      className: "bg-red-100 text-red-700",
    },
  };

  const cfg = map[status] ?? map.UNVERIFIED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function LandlordProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({ name: "", email: "", phoneNumber: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/landlord/profile");
        const json = await res.json();
        if (res.ok && json.success) {
          setProfile(json.data);
          setForm({
            name: json.data.name,
            email: json.data.email,
            phoneNumber: json.data.phoneNumber ?? "",
          });
        }
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/landlord/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save.");
      setProfile((prev) => prev ? { ...prev, ...json.data } : prev);
      setEditing(false);
      setSuccess("Profile updated successfully.");
      // Refresh session so navbar shows updated name
      await updateSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) setForm({ name: profile.name, email: profile.email, phoneNumber: profile.phoneNumber ?? "" });
    setEditing(false);
    setError("");
  };

  const initials = (profile?.name ?? session?.user?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/landlord"
        className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Avatar + stats card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-[#192F59] flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900 truncate">{profile?.name}</h2>
              <VerificationBadge status={profile?.verificationStatus ?? "UNVERIFIED"} />
            </div>
            <p className="text-gray-500 text-sm truncate">{profile?.email}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Home className="w-4 h-4" />
                {profile?._count.properties ?? 0} listing{profile?._count.properties !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Member since {profile ? new Date(profile.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "long" }) : "—"}
              </span>
            </div>
          </div>

          {!editing && (
            <button
              onClick={() => { setEditing(true); setSuccess(""); setError(""); }}
              className="flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors self-start sm:self-center"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Profile fields */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {/* Name */}
        <div className="p-6 flex items-start gap-4">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <User className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Full Name</p>
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/30"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profile?.name}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="p-6 flex items-start gap-4">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mail className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Email Address</p>
            {editing ? (
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/30"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profile?.email}</p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="p-6 flex items-start gap-4">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Phone className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Phone Number</p>
            {editing ? (
              <input
                type="tel"
                value={form.phoneNumber}
                placeholder="e.g. 08012345678"
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/30"
              />
            ) : (
              <p className="text-gray-900 font-medium">
                {profile?.phoneNumber ?? <span className="text-gray-400 italic">Not provided</span>}
              </p>
            )}
          </div>
        </div>

        {/* Account type — read only */}
        <div className="p-6 flex items-start gap-4">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Account Type</p>
            <p className="text-gray-900 font-medium capitalize">{profile?.role.toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* Save / Cancel */}
      {editing && (
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#192F59] hover:bg-blue-900 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Verification section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-5">
        <h3 className="font-semibold text-gray-900 mb-4">Verification Status</h3>

        <div className="space-y-3">
          {[
            { label: "Government ID", uploaded: !!profile?.governmentIdUrl },
            { label: "Selfie with ID", uploaded: !!profile?.selfieUrl },
            { label: "Ownership Proof", uploaded: !!profile?.ownershipProofUrl },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className={`text-xs font-medium flex items-center gap-1 ${item.uploaded ? "text-green-600" : "text-gray-400"}`}>
                {item.uploaded ? <><CheckCircle className="w-3.5 h-3.5" /> Uploaded</> : "Not uploaded"}
              </span>
            </div>
          ))}
        </div>

        {profile?.verificationNote && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
            <p className="font-medium mb-1">Rejection note from admin:</p>
            <p className="italic">&ldquo;{profile.verificationNote}&rdquo;</p>
          </div>
        )}

        {profile?.verificationStatus !== "VERIFIED" && (
          <div className="mt-4">
            <Link
              href="/landlord/verification"
              className="inline-flex items-center gap-2 bg-[#E67E22] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              {profile?.verificationStatus === "UNDER_REVIEW"
                ? "View Verification Status"
                : profile?.verificationStatus === "REJECTED"
                ? "Resubmit Documents"
                : "Complete Verification"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
