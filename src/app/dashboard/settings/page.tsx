import type { Metadata } from "next";
import { PageHeader } from "@/components/platform/widgets";
import { ProfileSettings } from "@/components/platform/profile-settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile and account. Authentication is handled by Supabase."
      />
      <ProfileSettings />
    </>
  );
}
