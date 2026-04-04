"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface PropertyData {
  id: string;
  title: string;
  description: string;
  price: number;
  distanceToCampus: number | null;
  amenities: string[];
  images: unknown[];
  status: string;
  location: Location;
  locationId: string;
  vacantUnits: number;
}

const AMENITY_OPTIONS = [
  "Wi-Fi / Internet",
  "Prepaid Meter",
  "Generator Backup",
  "Solar Power",
  "Borehole / Running Water",
  "Security / Gated",
  "CCTV",
  "Parking Space",
  "Wardrobe / Closet",
  "Tiled Floors",
  "POP Ceiling",
  "Kitchen",
  "Bathroom en-suite",
  "Balcony",
  "Furnished",
  "Air Conditioning",
  "Nearby Market",
];

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [locationId, setLocationId] = useState("");
  const [distanceToCampus, setDistanceToCampus] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [vacantUnits, setVacantUnits] = useState("1");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [propRes, locRes] = await Promise.all([
        fetch(`/api/properties/${id}`, { cache: "no-store" }),
        fetch("/api/locations", { cache: "no-store" }),
      ]);

      const propData = await propRes.json();
      const locData = await locRes.json();

      if (!propRes.ok || !propData.success) throw new Error(propData.error || "Property not found.");
      if (!locRes.ok || !locData.success) throw new Error("Could not load locations.");

      const prop = propData.data as PropertyData;
      setProperty(prop);
      setTitle(prop.title);
      setDescription(prop.description);
      setPrice(String(prop.price));
      setLocationId(prop.locationId);
      setDistanceToCampus(prop.distanceToCampus ? String(prop.distanceToCampus) : "");
      setAmenities(Array.isArray(prop.amenities) ? prop.amenities : []);
      setVacantUnits(String(prop.vacantUnits ?? 1));
      setLocations(locData.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load property.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          locationId,
          distanceToCampus: distanceToCampus ? Number(distanceToCampus) : null,
          amenities,
          vacantUnits: Number(vacantUnits),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to update property.");
      }

      setSuccess("Property updated and resubmitted for admin review.");
      setTimeout(() => router.push("/landlord"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-16 text-gray-500">Loading property...</div>;
  }

  if (!property) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error || "Property not found."}</p>
        <Link href="/landlord" className="text-[#192F59] hover:underline">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/landlord" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy">Edit Property</h1>
          <p className="text-gray-500 text-sm mt-0.5">Changes will reset the listing to PENDING for re-review.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/20"
            placeholder="e.g. Cozy Self-Contain Near BOUESTI"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/20 resize-none"
            placeholder="Describe the property in detail..."
          />
        </div>

        {/* Price + Vacant Units */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Rent (₦)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/20"
              placeholder="e.g. 150000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vacant Units</label>
            <input
              type="number"
              value={vacantUnits}
              onChange={(e) => setVacantUnits(e.target.value)}
              min={0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/20"
            />
          </div>
        </div>

        {/* Location + Distance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/20 bg-white"
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance to Campus (km)</label>
            <input
              type="number"
              value={distanceToCampus}
              onChange={(e) => setDistanceToCampus(e.target.value)}
              min={0}
              step={0.1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#192F59]/20"
              placeholder="e.g. 0.5"
            />
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AMENITY_OPTIONS.map((amenity) => (
              <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={amenities.includes(amenity)}
                  onChange={() => toggleAmenity(amenity)}
                  className="rounded border-gray-300 text-[#192F59]"
                />
                <span className="text-sm text-gray-700">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Note about images */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <strong>Note:</strong> To change property photos or videos, please contact support or delete and re-list the property. Only details above can be edited here.
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/landlord"
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#192F59] hover:bg-[#14264a] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
