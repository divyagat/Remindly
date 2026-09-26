import { redirect } from "next/navigation";
import SettingsPanel from "@/components/SettingsPanel";
import { getSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <SettingsPanel />
    </div>
  );
}
