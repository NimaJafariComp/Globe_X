import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Intelligence",
  description: "Split-screen company intelligence visualization",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
