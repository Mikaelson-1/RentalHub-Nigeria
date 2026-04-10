import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://rentalhub.ng"),
  applicationName: "RentalHub",
  title: {
    default: "RentalHub - Off-Campus Accommodation",
    template: "%s | RentalHub",
  },
  description:
    "Find verified off-campus accommodation for students. Browse properties near BOUESTI, book rooms, and manage your listings.",
  keywords: ["student accommodation", "off-campus housing", "BOUESTI", "student housing", "rental", "RentalHub"],
  authors: [{ name: "RentalHub" }],
  alternates: {
    canonical: "https://rentalhub.ng",
  },
  icons: {
    icon: [
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon-48.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://rentalhub.ng",
    siteName: "RentalHub",
    title: "RentalHub - Off-Campus Accommodation",
    description:
      "Find verified off-campus accommodation for students. Browse properties near BOUESTI, book rooms, and manage your listings.",
    images: [{ url: "/logo.png", width: 670, height: 338, alt: "RentalHub" }],
  },
  twitter: {
    card: "summary",
    title: "RentalHub - Off-Campus Accommodation",
    description: "Find verified off-campus accommodation for students.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RentalHub",
    url: "https://rentalhub.ng",
    logo: "https://rentalhub.ng/favicon-512.png",
  };

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="font-sans overflow-x-hidden">
        <Providers>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
