import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AIC Scholar Command Center", template: "%s · AIC Scholar" },
  description: "A personal intelligence dashboard for academic mastery, work accountability and life capacity.",
  icons: { icon: "/brand/aic-scholar-logo.png", apple: "/brand/aic-scholar-logo.png" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
