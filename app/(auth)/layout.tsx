import { Navbar } from "@/components/navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col h-screen">
      <Navbar minimal />
      <main className="container mx-auto max-w-7xl flex-grow">{children}</main>
    </div>
  );
}
