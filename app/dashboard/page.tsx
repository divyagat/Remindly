import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:py-8">
      <Dashboard name={session.name} />
    </div>
  );
}
