import { redirect } from "next/navigation";

// Everything lives on the home screen now; keep this address working for old links.
export default function Page() {
  redirect("/dashboard");
}
