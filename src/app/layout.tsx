import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import "@/lib/env"; // validates required env vars at startup

export const metadata: Metadata = {
  title: "RentalHub NG - Off-Campus Accommodation",
  description:
    "Find quality off-campus accommodation for Nigerian students. Browse properties, book rooms, and manage your listings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
