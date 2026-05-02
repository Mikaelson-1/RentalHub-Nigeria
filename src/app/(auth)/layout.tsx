import Navbar from "@/components/Navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar variant="public" />
      <main className="flex-grow bg-gray-50 overflow-x-hidden">{children}</main>
    </>
  );
}
