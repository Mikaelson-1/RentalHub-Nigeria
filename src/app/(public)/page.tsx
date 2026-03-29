import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-white to-gray-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-normal text-[#192F59] leading-[0.95] tracking-tight">
                YOUR
                <br />
                CAMPUS
                <br />
                HOME
              </h1>
              
              <p className="font-sans text-base text-gray-500 mt-6 ml-1">
                / Verified off-campus student housing /
              </p>

              {/* Search Widget */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md">
                <div className="relative flex-1">
                  <select className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3.5 font-sans text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E67E22]/20 focus:border-[#E67E22] cursor-pointer">
                    <option value="">Select your University...</option>
                    <option value="bouesti">BOUESTI - Ikere-Ekiti</option>
                    <option value="unilag">UNILAG - Lagos</option>
                    <option value="oau">OAU - Ile-Ife</option>
                    <option value="ui">University of Ibadan</option>
                    <option value="uniben">UNIBEN - Benin</option>
                    <option value="futa">FUTA - Akure</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <button className="bg-[#E67E22] hover:bg-[#D35400] text-white font-sans text-sm font-semibold px-8 py-3.5 rounded-xl transition-colors whitespace-nowrap">
                  Search
                </button>
              </div>
            </div>

            {/* Right Column - Main Card */}
            <div className="relative">
              <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 p-6 lg:p-8">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="px-4 py-1.5 border border-gray-200 rounded-full font-sans text-xs text-gray-600">
                    Verified
                  </span>
                  <span className="px-4 py-1.5 border border-gray-200 rounded-full font-sans text-xs text-gray-600">
                    Secure
                  </span>
                  <span className="px-4 py-1.5 bg-[#192F59] rounded-full font-sans text-xs text-white">
                    Close to Campus
                  </span>
                </div>

                {/* Text */}
                <h2 className="font-sans text-2xl font-semibold text-[#192F59] mb-1">
                  Premium Student Living
                </h2>
                <p className="font-sans text-sm text-gray-500 mb-6">
                  From single rooms to shared apartments.
                </p>

                {/* Image Container */}
                <div className="relative">
                  {/* Main Hostel Image */}
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl h-[280px] overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-40 h-40 text-gray-300" viewBox="0 0 200 160" fill="none">
                        {/* Modern Nigerian Hostel Building */}
                        <rect x="30" y="60" width="140" height="80" fill="#e5e5e5" stroke="#d4d4d4" strokeWidth="2"/>
                        <rect x="20" y="50" width="160" height="15" fill="#d4d4d4" stroke="#c4c4c4" strokeWidth="2"/>
                        {/* Windows */}
                        <rect x="45" y="75" width="25" height="35" fill="#f0f0f0" stroke="#d4d4d4" strokeWidth="1"/>
                        <rect x="87" y="75" width="25" height="35" fill="#f0f0f0" stroke="#d4d4d4" strokeWidth="1"/>
                        <rect x="130" y="75" width="25" height="35" fill="#f0f0f0" stroke="#d4d4d4" strokeWidth="1"/>
                        {/* Second Floor Windows */}
                        <rect x="45" y="120" width="25" height="15" fill="#f0f0f0" stroke="#d4d4d4" strokeWidth="1"/>
                        <rect x="87" y="120" width="25" height="15" fill="#f0f0f0" stroke="#d4d4d4" strokeWidth="1"/>
                        <rect x="130" y="120" width="25" height="15" fill="#f0f0f0" stroke="#d4d4d4" strokeWidth="1"/>
                        {/* Door */}
                        <rect x="85" y="110" width="30" height="30" fill="#c4c4c4" stroke="#b4b4b4" strokeWidth="1"/>
                        {/* Roof */}
                        <path d="M10 50 L100 20 L190 50" fill="none" stroke="#b4b4b4" strokeWidth="3"/>
                      </svg>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="absolute top-4 left-4 w-3 h-3 bg-[#E67E22] rounded-full" />
                    <div className="absolute top-8 right-8 w-2 h-2 bg-[#192F59] rounded-full" />
                  </div>

                  {/* VIRTUAL TOUR Widget */}
                  <div className="absolute -bottom-4 -right-4 bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                    <p className="font-sans text-[10px] font-bold text-[#192F59] tracking-wider mb-2">VIRTUAL TOUR</p>
                    <div className="flex items-center gap-2">
                      {/* Play Button */}
                      <button className="w-10 h-10 bg-[#E67E22] rounded-full flex items-center justify-center hover:bg-[#D35400] transition-colors">
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                      {/* Thumbnail */}
                      <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section */}
      <section className="bg-white py-12 lg:py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Left - Trust Card */}
            <div className="bg-[#F39C12] rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-sans text-xl font-semibold leading-tight">
                  No More Agent
                  <br />
                  Scams!
                </h3>
                <p className="font-sans text-xs text-white/80 mt-3">
                  100% verified landlords
                  <br />
                  and properties.
                </p>
              </div>
              {/* Security Shield Graphic */}
              <div className="absolute bottom-2 right-2 w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                  <path 
                    d="M40 10 L60 20 L60 45 Q60 60 40 70 Q20 60 20 45 L20 20 Z" 
                    fill="rgba(255,255,255,0.2)" 
                    stroke="rgba(255,255,255,0.4)" 
                    strokeWidth="2"
                  />
                  <path 
                    d="M35 40 L38 43 L45 36" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.6)" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <circle cx="40" cy="30" r="3" fill="rgba(255,255,255,0.4)"/>
                </svg>
              </div>
            </div>

            {/* Center - Stats */}
            <div className="flex flex-col items-center">
              {/* Overlapping Avatars */}
              <div className="flex -space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#192F59] to-[#2a4a7a] border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">JD</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E67E22] to-[#D35400] border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">AM</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F39C12] to-[#6ba882] border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+</span>
                </div>
              </div>
              {/* Stats */}
              <p className="font-serif italic text-4xl text-[#192F59]">5k+</p>
              <p className="font-sans text-sm text-gray-500">Students Housed</p>
            </div>

            {/* Right - Text */}
            <div className="text-center md:text-right">
              <p className="font-sans text-xs font-bold text-[#192F59] uppercase tracking-wider leading-relaxed">
                WE COMBINE
                <br />
                CONVENIENCE &
                <br />
                CAMPUS PROXIMITY
              </p>
              <Link
                href="#"
                className="inline-block mt-4 font-sans text-xs font-bold text-[#E67E22] underline underline-offset-4 hover:text-[#D35400] transition-colors"
              >
                EXPLORE LOCATIONS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="font-sans text-xs font-bold text-[#E67E22] uppercase tracking-widest mb-2">
              Why Choose Us
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-[#192F59]">
              The <span className="italic">RentalHub NG</span> Advantage
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-8 h-8 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "Verified Properties",
                description: "Every hostel is physically inspected and verified by our team before listing."
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: "Prime Locations",
                description: "Find hostels within walking distance to your campus and lecture halls."
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ),
                title: "Secure Payments",
                description: "Pay securely online. Your money is held safely until you move in."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-[#E67E22]/10 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-sans text-lg font-semibold text-[#192F59] mb-2">
                  {feature.title}
                </h3>
                <p className="font-sans text-sm text-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#192F59] py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-sans text-xs font-bold text-[#F39C12] uppercase tracking-widest mb-4">
            Get Started Today
          </p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white mb-6 leading-tight">
            Ready to Find Your
            <br />
            <span className="italic">Perfect Hostel?</span>
          </h2>
          <p className="font-sans text-gray-300 text-base mb-10 max-w-lg mx-auto">
            Join thousands of Nigerian students who found their ideal off-campus accommodation through RentalHub NG.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#"
              className="bg-[#E67E22] hover:bg-[#D35400] text-white font-sans text-sm font-semibold px-10 py-4 rounded-xl transition-colors"
            >
              FIND A HOSTEL
            </Link>
            <Link
              href="#"
              className="border border-white/30 hover:border-white text-white font-sans text-sm font-semibold px-10 py-4 rounded-xl transition-colors"
            >
              LIST YOUR PROPERTY
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
