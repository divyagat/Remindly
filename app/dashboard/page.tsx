import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { narrowPage } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className={narrowPage}>
      <Dashboard name={session.name} />
    </div>
  );
}
