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
  const [reason, setReason] = useState("");

  const updateStatus = async (status: "APPROVED" | "REJECTED") => {
    setLoadingAction(status);
    setError("");

    if (status === "REJECTED" && !reason.trim()) {
      setError("Please enter a rejection reason before rejecting.");
      setLoadingAction("");
      return;
    }

    try {
      const response = await fetch(`/api/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reason.trim() || undefined }),
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
      <div className="flex flex-wrap gap-3">
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for rejection (required only when rejecting)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => updateStatus("APPROVED")}
          disabled={Boolean(loadingAction)}
          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          {loadingAction === "APPROVED" ? "Approving..." : "Approve Listing"}
        </button>
        <button
          onClick={() => updateStatus("REJECTED")}
          disabled={Boolean(loadingAction)}
          className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          {loadingAction === "REJECTED" ? "Rejecting..." : "Reject Listing"}
        </button>
      </div>
    </div>
  );
}
