import { redirect } from "next/navigation";
import { createOptionalClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/email";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createOptionalClient();
  if (!supabase) redirect("/");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) redirect("/");

  return <div>{children}</div>;
}
