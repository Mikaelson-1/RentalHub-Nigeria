import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar variant="public" />
      <main className="flex-grow overflow-x-hidden">{children}</main>
      <Footer />
    </>
  );
}
