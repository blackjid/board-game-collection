import { getCurrentUser } from "@/lib/auth";
import { SettingsLayoutClient } from "@/components/SettingsLayoutClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  // Redirect non-admin users to home
  if (!currentUser || currentUser.role !== "admin") {
    redirect("/?error=unauthorized");
  }

  return (
    <SettingsLayoutClient>
      {children}
    </SettingsLayoutClient>
  );
}
