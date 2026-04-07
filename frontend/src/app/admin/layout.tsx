export const dynamic = "force-dynamic";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <AdminAuthGate>{children}</AdminAuthGate>
      </div>
    </div>
  );
}
