"use client";

import { useState } from "react";
import Link from "next/link";

// Mock data - replace with actual API calls
const mockListings = [
  {
    id: "1",
    title: "Modern Self-Contain in Uro",
    location: "Uro",
    price: "₦150,000/year",
    status: "APPROVED",
    views: 45,
    inquiries: 3,
  },
  {
    id: "2",
    title: "2-Bedroom Flat near Campus",
    location: "Odo Oja",
    price: "₦200,000/year",
    status: "PENDING",
    views: 12,
    inquiries: 0,
  },
  {
    id: "3",
    title: "Student Hostel - 5 Rooms",
    location: "Afao",
    price: "₦100,000/year",
    status: "APPROVED",
    views: 89,
    inquiries: 7,
  },
];

const mockRequests = [
  {
    id: "1",
    student: "John Doe",
    property: "Modern Self-Contain in Uro",
    date: "2024-03-20",
    status: "PENDING",
  },
  {
    id: "2",
    student: "Jane Smith",
    property: "Student Hostel - 5 Rooms",
    date: "2024-03-19",
    status: "ACCEPTED",
  },
];

export default function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState<"listings" | "requests">(
    "listings"
  );
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">Landlord Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your listings and tenant requests
          </p>
        </div>
        <Link
          href="/landlord/add-property"
          className="bg-[#E67E22] hover:bg-[#D35400] text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Add Property</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">
            {mockListings.length}
          </div>
          <div className="text-gray-600">Total Listings</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">
            {mockListings.filter((l) => l.status === "APPROVED").length}
          </div>
          <div className="text-gray-600">Approved</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">
            {mockRequests.filter((r) => r.status === "PENDING").length}
          </div>
          <div className="text-gray-600">Pending Requests</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-primary-green">
            {mockListings.reduce((acc, l) => acc + l.views, 0)}
          </div>
          <div className="text-gray-600">Total Views</div>
        </div>
      </div>

      {/* Tabs */}
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
              {mockRequests.filter((r) => r.status === "PENDING").length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {mockRequests.filter((r) => r.status === "PENDING").length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "listings" ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Property
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Views
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockListings.map((listing) => (
                    <tr key={listing.id} className="border-b border-gray-100">
                      <td className="py-4 px-4">
                        <div className="font-medium text-navy">
                          {listing.title}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {listing.location}
                      </td>
                      <td className="py-4 px-4 text-primary-green font-medium">
                        {listing.price}
                      </td>
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
                        {listing.views}
                      </td>
                      <td className="py-4 px-4">
                        <button className="text-primary-green hover:text-primary-dark font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {mockRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No tenant requests yet</p>
                </div>
              ) : (
                mockRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-semibold text-navy">
                        {request.student}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Interested in: {request.property}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Requested on {request.date}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {request.status === "PENDING" ? (
                        <>
                          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            Accept
                          </button>
                          <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            Decline
                          </button>
                        </>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          Accepted
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Property Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-navy mb-4">Add Property</h2>
            <p className="text-gray-600 mb-6">
              Property creation form will be implemented here.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-[#E67E22] hover:bg-[#D35400] text-white px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
