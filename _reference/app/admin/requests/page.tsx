import AdminShell from "@/components/admin/AdminShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Requests",
};

export default function AdminRequestsPage() {
  return <AdminShell activeTab="requests" />;
}
