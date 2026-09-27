import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import OfflineSupport from "@/components/OfflineSupport";
import ReminderPopup from "@/components/ReminderPopup";
import SoundBanner from "@/components/SoundBanner";
import { AUTH_ENABLED, getSession } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Remindly",
  description: "Your personal reminders and task manager.",
  appleWebApp: { capable: true, title: "Remindly" },
};

export const viewport: Viewport = {
  // Lets the layout use the full screen on notched phones (see the safe-area padding).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Navbar
          user={session ? { name: session.name, email: session.email } : null}
          authEnabled={AUTH_ENABLED}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <OfflineSupport />
          {session && <SoundBanner />}
          {/* Bottom padding keeps content clear of the phone tab bar. */}
          <main className={`flex flex-1 flex-col ${session ? "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}>{children}</main>
        </div>
        <ReminderPopup />
      </body>
    </html>
  );
}
