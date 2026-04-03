export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#192F59]">Terms of Service</h1>
        <p className="text-gray-600 mt-4">
          By using RentalHub NG, you agree to the terms below. These terms govern platform use by students, landlords,
          and administrators.
        </p>

        <div className="mt-6 space-y-5 text-sm text-gray-700">
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">1. Account Responsibilities</h2>
            <p>Users must provide accurate information, keep credentials secure, and avoid sharing accounts.</p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">2. Listing Standards</h2>
            <p>
              Landlords must submit truthful listings with accurate prices, amenities, and media evidence. Misleading,
              duplicate, or fraudulent listings may be rejected or removed.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">3. Moderation and Enforcement</h2>
            <p>
              RentalHub may approve, reject, suspend, or remove listings and accounts that violate platform rules,
              applicable law, or safety standards.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">4. Bookings and Communication</h2>
            <p>
              Booking requests and confirmations are tracked on-platform. Users must communicate respectfully and avoid
              abusive behavior.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">5. Liability Notice</h2>
            <p>
              RentalHub facilitates listing discovery and booking workflows but is not a direct party to tenancy agreements.
              Users are responsible for due diligence and contractual decisions.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">6. Contact</h2>
            <p>
              For policy questions, contact{" "}
              <a className="text-[#E67E22] hover:underline" href="mailto:support@rentalhub.ng">
                support@rentalhub.ng
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
