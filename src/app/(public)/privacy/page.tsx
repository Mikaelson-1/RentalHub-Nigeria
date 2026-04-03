export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#192F59]">Privacy Policy</h1>
        <p className="text-gray-600 mt-4">
          This policy explains how RentalHub NG collects, uses, stores, and protects personal data for students,
          landlords, and administrators.
        </p>

        <div className="mt-6 space-y-5 text-sm text-gray-700">
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">1. Data We Collect</h2>
            <p>
              We collect account data (name, email, role), listing data (property details and uploaded media), and
              booking activity needed to operate the platform.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">2. How We Use Data</h2>
            <p>
              Data is used to authenticate users, moderate listings, support booking workflows, prevent abuse, and improve
              reliability.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">3. Data Sharing</h2>
            <p>
              We do not sell personal data. We may share limited operational data with infrastructure providers required to
              host and secure the service.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">4. Data Retention</h2>
            <p>
              We retain account and transaction records while needed for service operations, dispute handling, legal
              obligations, and security.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">5. Your Rights</h2>
            <p>
              You may request corrections, account deactivation, or data deletion (where legally permitted) by contacting
              support.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-[#192F59] mb-1">6. Contact</h2>
            <p>
              Privacy requests can be sent to{" "}
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
