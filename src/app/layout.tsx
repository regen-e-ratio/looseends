import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/config";
import { Analytics } from "@/components/analytics";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Tie up your loose ends: write down your accounts, subscriptions and wishes, and make sure they reach the right people if something happens to you.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
