"use client";

import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-[#E67E22]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            className="w-10 h-10 text-[#E67E22]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="font-serif text-2xl font-bold text-[#192F59] mb-4">
          Account Under Review
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          Thank you for registering as a landlord on RentalHub NG. 
          Your account is currently being reviewed by our admin team to ensure 
          the safety and quality of our platform.
        </p>

        {/* What to expect */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <h3 className="font-semibold text-[#192F59] mb-2 text-sm">What happens next?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-[#E67E22] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Our team will verify your information within 24-48 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-[#E67E22] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Check your dashboard for status updates once reviewed</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-[#E67E22] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>After approval, you can start listing your properties</span>
            </li>
          </ul>
        </div>

        {/* Contact info */}
        <p className="text-sm text-gray-500 mb-6">
          Have questions? Contact us at{" "}
          <a href="mailto:support@rentalhub.ng" className="text-[#E67E22] hover:underline">
            support@rentalhub.ng
          </a>
        </p>

        {/* Back to home */}
        <Link
          href="/"
          className="inline-block bg-[#192F59] hover:bg-[#0f1d3a] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
