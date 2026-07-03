// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/shared/QueryProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "CMMS Pro",
  description: "Enterprise Computerized Maintenance Management System",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
