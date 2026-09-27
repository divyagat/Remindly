import { BellRing } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { primaryButton, secondaryButton } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white">
        <BellRing className="h-8 w-8" />
      </span>
      <h1 className="text-4xl font-bold tracking-tight">Never forget what matters</h1>
      <p className="max-w-md text-lg text-zinc-500">
        Add a task, pick a time, and Remindly reminds you out loud, even offline.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className={`${secondaryButton} px-5 py-3 text-base`}>
          Log in
        </Link>
        <Link href="/register" className={`${primaryButton} px-5 py-3 text-base`}>
          Get started
        </Link>
      </div>
    </div>
  );
}
