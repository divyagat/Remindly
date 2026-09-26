import { redirect } from "next/navigation";
import CalendarView from "@/components/CalendarView";
import { getSession } from "@/lib/auth";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
      <CalendarView />
    </div>
  );
}
