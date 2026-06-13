import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome",
};

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) {
    return <OnboardingForm />;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");
    // Already completed onboarding
    if (user.user_metadata?.role) redirect("/");
  } catch {
    redirect("/login");
  }

  return <OnboardingForm />;
}
