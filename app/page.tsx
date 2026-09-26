import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">Remindly</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Never forget what matters. Create reminders, set priorities, and stay on track.
      </p>
      <div className="flex gap-3">
        {session ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
