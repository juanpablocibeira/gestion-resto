import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role || "WAITER";
  const userName = session.user.name || "Usuario";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userName={userName} />
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar role={role} userName={userName} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
