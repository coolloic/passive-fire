import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { OfflineIndicator } from "@/components/organisms/OfflineIndicator";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "QAntum Team Leader",
  description: "Check material readiness for planned passive fire work before going on site.",
  applicationName: "QAntum Team Leader",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Team Leader", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#b91c1c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans text-base antialiased`}>
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}
