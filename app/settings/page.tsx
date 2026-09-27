import { redirect } from "next/navigation";
import SettingsPanel from "@/components/SettingsPanel";
import { narrowPage } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className={`${narrowPage} space-y-6`}>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
      <SettingsPanel />
    </div>
  );
}
