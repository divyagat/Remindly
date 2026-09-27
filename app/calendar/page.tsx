import { redirect } from "next/navigation";
import CalendarView from "@/components/CalendarView";
import { page } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className={page}>
      <CalendarView />
    </div>
  );
}
