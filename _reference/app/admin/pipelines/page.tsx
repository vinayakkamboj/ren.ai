import AdminShell from "@/components/admin/AdminShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

export default function PipelinesPage() {
  return <AdminShell activeTab="pipelines" />;
}
