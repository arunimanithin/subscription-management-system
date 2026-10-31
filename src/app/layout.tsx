import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SubscriptIQ",
  description: "Subscription management system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
