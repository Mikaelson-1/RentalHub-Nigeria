"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewActionsProps {
  propertyId: string;
}

export default function ReviewActions({ propertyId }: ReviewActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState<"APPROVED" | "REJECTED" | "">("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const updateStatus = async (status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !rejectionReason.trim()) {
      setError("Please provide a rejection reason before rejecting.");
      return;
    }

    setLoadingAction(status);
    setError("");

    try {
      const response = await fetch(`/api/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "REJECTED" && { rejectionReason: rejectionReason.trim() }),
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `Failed to set ${status.toLowerCase()}.`);
      }

      router.push("/admin");
      router.refresh();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update status.");
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showRejectForm && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            placeholder="Explain why this listing is being rejected (e.g., blurry photos, missing amenities info, suspicious pricing)..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">This reason will be visible to the landlord.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => updateStatus("APPROVED")}
          disabled={Boolean(loadingAction) || showRejectForm}
          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          {loadingAction === "APPROVED" ? "Approving..." : "Approve Listing"}
        </button>

        {!showRejectForm ? (
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={Boolean(loadingAction)}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            Reject Listing
          </button>
        ) : (
          <>
            <button
              onClick={() => updateStatus("REJECTED")}
              disabled={Boolean(loadingAction) || !rejectionReason.trim()}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              {loadingAction === "REJECTED" ? "Rejecting..." : "Confirm Rejection"}
            </button>
            <button
              onClick={() => { setShowRejectForm(false); setRejectionReason(""); setError(""); }}
              disabled={Boolean(loadingAction)}
              className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
