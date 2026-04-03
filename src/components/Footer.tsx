import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white text-black mt-0 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Image
              src="/logo.png"
              alt="RentalHub NG"
              width={180}
              height={40}
              className="h-9 w-auto"
            />
            <p className="text-sm text-black mt-3 leading-relaxed">
              Verified off-campus accommodation for students, built to reduce scams and make housing decisions faster.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-[#E67E22]">Quick Links</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm text-black">
              <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
              <Link href="/properties" className="hover:text-gray-700 transition-colors">Properties</Link>
              <Link href="/#how-it-works" className="hover:text-gray-700 transition-colors">How it Works</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-[#E67E22]">Legal</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm text-black">
              <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-[#E67E22]">Support</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm text-black">
              <a href="mailto:support@rentalhub.ng" className="hover:text-gray-700 transition-colors">support@rentalhub.ng</a>
              <a href="tel:+2340000000000" className="hover:text-gray-700 transition-colors">+234 000 000 0000</a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-black">
          © {new Date().getFullYear()} RentalHub NG. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
