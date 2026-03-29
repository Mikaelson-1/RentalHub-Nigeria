import PublicNavbar from "@/components/PublicNavbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNavbar />
      <main className="flex-grow">{children}</main>
    </>
  );
}
