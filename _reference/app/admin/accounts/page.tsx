import AdminShell from "@/components/admin/AdminShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Accounts",
};

export default function AdminAccountsPage() {
  return <AdminShell activeTab="accounts" />;
}
