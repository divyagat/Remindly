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
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center sm:gap-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white">
        <BellRing className="h-8 w-8" />
      </span>
      <h1 className="max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">Never forget what matters</h1>
      <p className="max-w-md text-base text-zinc-500 sm:text-lg">
        Add a task, pick a time, and Remindly reminds you out loud, even offline.
      </p>
      <div className="flex w-full max-w-xs flex-col-reverse gap-3 sm:w-auto sm:max-w-none sm:flex-row">
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
